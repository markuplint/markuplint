/**
 * @module disambiguate
 *
 * Decides, in a flat `Pretender[]` list, which candidates the file actually
 * being linted refers to: it resolves selector collisions — the same thing
 * {@link ./dependency-mapper.js} does while a scanner builds its output, but
 * applied here at lint time — and rules out the candidates of a name that the
 * file imports from a package. This is what closes the other half of issue
 * #3951: even once the generated pretenders JSON carries independent entries
 * for two same-named components declared in different files,
 * `MLElement.pretending()` still matches by CSS selector alone — it has no
 * file context, so it can't tell them apart on its own.
 *
 * This module inspects the lint target's own declarations and imports to
 * pick, among several same-named candidates, the one the file actually
 * refers to. It leaves the list untouched whenever that can't be confirmed,
 * with one exception: a name confirmed to come from a package (installed or
 * not, directly or through a re-export) is none of the project's components,
 * so every candidate of that name is dropped, even a lone one. Left in,
 * `MLElement.pretending()` would take the first for the package's component.
 *
 * Only a selector the source text names is looked at, so a file that renders
 * none of the scanned components costs no import analysis.
 */

import type { Declaration } from './dependency-mapper.js';
import type { ImportBinding } from './import-resolver/types.js';
import type { Pretender } from '@markuplint/ml-config';

import { parsePretenderFilePath } from '@markuplint/ml-config';
import { capitalize, pascalize } from '@markuplint/shared';

import {
	FROM_PACKAGE,
	declarationChain,
	isPackageFile,
	resolveDeclaration,
	resolveModule,
} from './dependency-mapper.js';
import { DEFAULT_LOCAL_NAME } from './export-table.js';
import {
	analyzeImports,
	isComponentBinding,
	isVueFile,
	kebabToPascalCase,
	resolveSelectorImport,
} from './import-resolver/index.js';
import { normalizePath } from './import-resolver/resolve-module-file.js';

/**
 * A JavaScript identifier, kebab-case included: the selector of a scanned component, the name
 * of a file (`componentNameOfFile`) among them. ZWNJ and ZWJ are `Join_Control`. It is the
 * identifier of `RE_COMPONENT_IDENTIFIER` in `template/derive-name`, kebab-case added: change
 * the two together.
 */
const RE_SIMPLE_COMPONENT_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}\p{Join_Control}$-]*$/u;

/** A whole identifier, kebab-case included: what a selector of {@link RE_SIMPLE_COMPONENT_NAME} is made of. */
const RE_IDENTIFIER = /[\p{ID_Continue}\p{Join_Control}$-]+/gu;

/**
 * Identifies the file to disambiguate pretenders against.
 */
export interface DisambiguateOptions {
	/** Absolute path of the file being linted. */
	readonly filePath: string;
	/** Full source text of the file being linted. */
	readonly sourceCode: string;
	/**
	 * A sink for the `tsconfig.json` (with what it `extends`) the target's
	 * imports were resolved with, and for the files read to follow a barrel's
	 * re-exports (see `PretenderScanOptions#dependencies`).
	 * The target file itself is not recorded: the caller already holds it.
	 */
	readonly dependencies?: Set<string>;
	/**
	 * The project root, the base directory the pretenders' paths were scanned under.
	 * Without it, a file is judged to be a package's by its whole path, so in a project
	 * that itself sits under `node_modules` a star re-export chain is not followed.
	 */
	readonly cwd?: string;
}

/**
 * @param pretenders - The resolved pretender list a lint run would otherwise
 *   use as-is. Entries without a `filePath`, or whose `selector` isn't a
 *   plain identifier, are never touched.
 * @param options - The file being linted, used to resolve which same-selector
 *   candidate it actually refers to. A name it imports from a package drops
 *   every candidate of that name, a lone one included.
 * @returns The disambiguated pretender list, or `pretenders` itself (same
 *   reference) when there was nothing to resolve or nothing could be confirmed.
 */
export async function disambiguatePretenders(
	pretenders: readonly Pretender[],
	options: DisambiguateOptions,
): Promise<readonly Pretender[]> {
	const groups = groupCandidates(pretenders, options.sourceCode, options.filePath);
	if (groups.size === 0) {
		// Fast path: no file-backed candidate's selector appears in the source,
		// so there's nothing to resolve — skip import analysis entirely.
		return pretenders;
	}

	const importResult = await analyzeImports(options.filePath, options.sourceCode);
	const bindings = importResult?.bindings ?? [];

	const losers = new Set<Pretender>();

	for (const group of groups.values()) {
		// A tag never names a default export of its own file that has no name: in that file the
		// name is another binding or none, and only an import gives the default export a name.
		const candidates = group.filter(c => {
			const own = c.localName === DEFAULT_LOCAL_NAME && matchesFile(c.filePath!, options.filePath);
			if (own) {
				losers.add(c);
			}
			return !own;
		});
		if (candidates.length === 0) {
			continue;
		}
		const winner = resolveWinner(candidates, options, bindings);
		if (!winner) {
			continue;
		}
		if (typeof winner === 'object' && 'exclude' in winner) {
			for (const candidate of winner.exclude) {
				losers.add(candidate);
			}
			continue;
		}
		for (const candidate of candidates) {
			if (candidate !== winner) {
				losers.add(candidate);
			}
		}
	}

	if (losers.size === 0) {
		return pretenders;
	}

	return pretenders.filter(p => !losers.has(p));
}

/**
 * Whether the source names the selector as a whole identifier: the selector itself, or the
 * PascalCase name a Vue-style script imports a kebab-case one as (the one
 * {@link resolveSelectorImport} looks for). A selector the source does not name has no
 * binding in the file, so nothing could be resolved for it.
 *
 * In a Vue file the names are the ones of `vueTagNameMatches`, which is for the selector to be named
 * as a tag (`<foo-bar>`, `<fooBar>`) or as a binding (`fooBar`) of any spelling: `names` holds each
 * identifier of the source as it is, capitalized and in PascalCase, and the selector is looked up as
 * it is and in PascalCase. It is a wide filter, as `resolveWinner` decides on the binding.
 */
function namesSelector(
	identifiers: ReadonlySet<string>,
	selector: string,
	getVueNames?: () => ReadonlySet<string>,
): boolean {
	if (identifiers.has(selector) || identifiers.has(kebabToPascalCase(selector))) {
		return true;
	}
	if (!getVueNames) {
		return false;
	}
	const vueNames = getVueNames();
	return vueNames.has(selector) || vueNames.has(pascalize(selector));
}

/**
 * Groups the file-backed candidates by selector, for the selectors the source text names.
 * A lone candidate is a group too: it may be a package's component that shares the name.
 */
function groupCandidates(
	pretenders: readonly Pretender[],
	sourceCode: string,
	filePath: string,
): Map<string, Pretender[]> {
	const bySelector = new Map<string, Pretender[]>();
	// Tokenized once: a scan can hold thousands of candidates, and this runs for every linted file.
	const identifiers = new Set<string>(sourceCode.match(RE_IDENTIFIER));
	// Built when a selector is not named as it is, and then once: most files name what they use as they write it.
	let vueNames: ReadonlySet<string> | undefined;
	const getVueNames = isVueFile(filePath)
		? () =>
				(vueNames ??= new Set(
					[...identifiers].flatMap(identifier => [identifier, capitalize(identifier), pascalize(identifier)]),
				))
		: undefined;

	for (const pretender of pretenders) {
		if (!pretender.filePath || !RE_SIMPLE_COMPONENT_NAME.test(pretender.selector)) {
			continue;
		}
		if (!namesSelector(identifiers, pretender.selector, getVueNames)) {
			continue;
		}
		const list = bySelector.get(pretender.selector);
		if (list) {
			list.push(pretender);
		} else {
			bySelector.set(pretender.selector, [pretender]);
		}
	}

	return bySelector;
}

/**
 * Picks the one candidate `filePath` actually refers to: first a same-file
 * local declaration, then an import binding resolved via TypeScript module
 * resolution — and, when the imported module is a barrel that declares none
 * of the candidates, through its re-exports to the declaring file. Returns
 * `FROM_PACKAGE` when the name is confirmed to come from a package, directly or
 * through a re-export: the caller drops the whole group, since none of the
 * candidates is what the file renders, and `{ exclude }` of the whole group when it
 * leads to a declaration that has no candidate (see {@link pickDeclared}) — or `{ exclude }`
 * when it confirms only that some of them are not it: a default export named after
 * its file is the component of no import but one that leads to it. Returns `null`
 * when nothing confirms a candidate, so the caller leaves the whole group untouched.
 */
function resolveWinner(
	candidates: readonly Pretender[],
	{ filePath, sourceCode, dependencies, cwd }: DisambiguateOptions,
	bindings: readonly ImportBinding[],
): Pretender | typeof FROM_PACKAGE | { readonly exclude: readonly Pretender[] } | null {
	const local = candidates.find(c => matchesFile(c.filePath!, filePath));
	if (local) {
		return local;
	}

	// A binding that a tag cannot refer to in the language of the file is not looked at (`isComponentBinding`).
	const binding = resolveSelectorImport(
		candidates[0]!.selector,
		bindings.filter(b => isComponentBinding(b, filePath)),
		filePath,
	);
	// A dynamic binding found by name is one that `lazy(() => import('./X'))` assigned the name to,
	// or that `const { X } = await import('./X')` declared (see `dynamicImportName`), so it
	// resolves like the static import of the export it names; one without a name is `'*'` and
	// found by none.
	if (!binding || binding.type === 'namespace') {
		return null;
	}

	const resolvedAbs = resolveModule(filePath, binding.source, { sources: undefined, dependencies, cwd });
	if (!resolvedAbs) {
		return null;
	}

	// No import names a default export without a name of its own file but a default import:
	// `export { default as X }` without `from` is no valid syntax.
	const direct = candidates.filter(
		c =>
			matchesFile(c.filePath!, resolvedAbs) &&
			(binding.importedName === 'default' || c.localName !== DEFAULT_LOCAL_NAME),
	);
	// Without a local name there is nothing for the export table to tell apart: a template
	// component is its file, and a list scanned before `localName` names none. The only
	// candidate declared under the imported name (or the default export, for a default import)
	// is it, as it was before `localName`.
	if (
		direct.length === 1 &&
		(direct[0]!.localName == null ||
			direct[0]!.localName === (binding.importedName === 'default' ? DEFAULT_LOCAL_NAME : binding.importedName))
	) {
		return direct[0]!;
	}
	// Before the export table: a package's own is not built (see `resolveDeclaration`). A
	// candidate of the package itself (a scan that reached into `node_modules`) is matched by
	// its file, as before `localName`.
	if (isPackageFile(resolvedAbs, cwd)) {
		return preferDefaultExport(direct, binding.importedName) ?? fromPackage(candidates, cwd);
	}

	// The lint target can be part of a re-export chain, so its unsaved text
	// stands in for what is on disk — and it stays out of `dependencies`, as the
	// option promises.
	const targetKey = normalizePath(filePath);
	const sources = new Map([[targetKey, sourceCode]]);
	const read = new Set<string>();
	const declaration = resolveDeclaration(resolvedAbs, binding.importedName, {
		sources,
		dependencies: read,
		cwd,
	});
	for (const file of read) {
		if (file !== targetKey) {
			dependencies?.add(file);
		}
	}
	if (!declaration) {
		// Nothing confirmed: the file is matched as before, without the default exports a named
		// import cannot lead to (`direct` leaves them out). When none is left, the group is left
		// as it is but for those default exports.
		return preferDefaultExport(direct, binding.importedName) ?? excludeOwnDefaultExports(candidates, resolvedAbs);
	}
	const chain = declarationChain(declaration);
	if (
		isPackageFile(declaration.fileAbs, cwd) &&
		!candidates.some(c => matchesFile(c.filePath!, declaration.fileAbs))
	) {
		return fromPackage(candidates, cwd);
	}
	// The import is confirmed to lead to `declaration`: none of the group is what it names
	// unless one is the component of the declaration, or of what it wraps.
	return pickDeclared(candidates, chain) ?? { exclude: candidates };
}

/**
 * The candidate of the imported file that the import names, for a match by its file: its
 * default export for a default import, otherwise the first.
 */
function preferDefaultExport(direct: readonly Pretender[], importedName: string): Pretender | undefined {
	return (importedName === 'default' ? direct.find(c => c.localName === DEFAULT_LOCAL_NAME) : undefined) ?? direct[0];
}

/**
 * Rules out the default exports without a name of their own of the imported module (a named
 * import cannot lead to them, `direct` leaves them out), and leaves the rest of the group as
 * it is.
 */
function excludeOwnDefaultExports(
	candidates: readonly Pretender[],
	resolvedAbs: string,
): { readonly exclude: readonly Pretender[] } | null {
	const exclude = candidates.filter(c => c.localName === DEFAULT_LOCAL_NAME && matchesFile(c.filePath!, resolvedAbs));
	return exclude.length > 0 ? { exclude } : null;
}

/**
 * Picks the candidate of the declaration, or else of what it wraps (`export default memo(Named)`,
 * see `ExportEntry` of `export-table`): a component declared under a name and a default export
 * named after the file can share a selector, and `localName` tells them apart. A candidate
 * without `localName` (a template component, or a list scanned before it was added) is matched
 * by its file, as before.
 *
 * `undefined` when none is: the declaration has no component (`@pretends null`, a file name that
 * makes no component name, or one the scanner cannot describe).
 */
function pickDeclared(candidates: readonly Pretender[], chain: readonly Declaration[]): Pretender | undefined {
	for (const declaration of chain) {
		const declared = candidates.filter(c => matchesFile(c.filePath!, declaration.fileAbs));
		const match =
			declared.find(c => c.localName == null) ??
			(declaration.localName == null ? declared[0] : declared.find(c => c.localName === declaration.localName));
		if (match) {
			return match;
		}
	}
	return undefined;
}

/**
 * What {@link resolveWinner} returns once the name is known to lead into a package. A candidate
 * that is itself declared in a package (a scan that reached into `node_modules`) is the component
 * the file renders, so nothing is ruled out then: `null`, as when nothing could be confirmed.
 */
function fromPackage(candidates: readonly Pretender[], cwd: string | undefined): typeof FROM_PACKAGE | null {
	const declaredInPackage = candidates.some(c =>
		isPackageFile(parsePretenderFilePath(c.filePath!)?.path ?? c.filePath!, cwd),
	);
	return declaredInPackage ? null : FROM_PACKAGE;
}

function matchesFile(pretenderFilePath: string, targetAbsPath: string): boolean {
	const pathPart = parsePretenderFilePath(pretenderFilePath)?.path ?? pretenderFilePath;
	return normalizePath(pathPart) === normalizePath(targetAbsPath);
}
