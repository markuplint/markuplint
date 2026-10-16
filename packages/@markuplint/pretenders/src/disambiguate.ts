/**
 * @module disambiguate
 *
 * Resolves selector collisions in a flat `Pretender[]` list — the same thing
 * {@link ./dependency-mapper.js} does while a scanner builds its output, but
 * applied here at lint time to the file actually being linted. This is what
 * closes the other half of issue #3951: even once the generated pretenders
 * JSON carries independent entries for two same-named components declared in
 * different files, `MLElement.pretending()` still matches by CSS selector
 * alone — it has no file context, so it can't tell them apart on its own.
 *
 * This module inspects the lint target's own declarations and imports to
 * pick, among several same-named candidates, the one the file actually
 * refers to — falling back to leaving the list untouched whenever that can't
 * be confirmed, so lint output never gets worse than the pre-existing
 * first-match behavior.
 *
 * A name the file imports from a package (installed or not) is confirmed to be
 * none of the project's components, so every candidate of that name is dropped,
 * even a lone one: left in, `MLElement.pretending()` would take the first for
 * the package's component. Only a selector the source text names is looked at,
 * so a file that renders none of the scanned components costs no import analysis.
 */

import type { ImportBinding } from './import-resolver/types.js';
import type { Pretender } from '@markuplint/ml-config';

import { parsePretenderFilePath } from '@markuplint/ml-config';

import { isPackageFile, resolveDeclarationFile, resolveModule } from './dependency-mapper.js';
import { analyzeImports, kebabToPascalCase, resolveComponentImport } from './import-resolver/index.js';
import { normalizePath } from './import-resolver/resolve-module-file.js';

const RE_SIMPLE_COMPONENT_NAME = /^[A-Z][\w$-]*$/i;

/**
 * What {@link resolveWinner} returns for a name confirmed to come from a package: unlike
 * `null` ("could not confirm"), it rules out every candidate.
 */
const FROM_PACKAGE = Symbol('from-package');

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
 *   candidate it actually refers to.
 * @returns The disambiguated pretender list, or `pretenders` itself (same
 *   reference) when there was nothing to resolve or nothing could be confirmed.
 */
export async function disambiguatePretenders(
	pretenders: readonly Pretender[],
	options: DisambiguateOptions,
): Promise<readonly Pretender[]> {
	const groups = groupCandidates(pretenders, options.sourceCode);
	if (groups.size === 0) {
		// Fast path: no file-backed candidate's selector appears in the source,
		// so there's nothing to resolve — skip import analysis entirely.
		return pretenders;
	}

	const importResult = await analyzeImports(options.filePath, options.sourceCode);
	const bindings = importResult?.bindings ?? [];

	const losers = new Set<Pretender>();

	for (const candidates of groups.values()) {
		const winner = resolveWinner(candidates, options, bindings);
		if (!winner) {
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
 * {@link resolveComponentImport} looks for). A selector the source does not name has no
 * binding in the file, so nothing could be resolved for it.
 */
function namesSelector(sourceCode: string, selector: string): boolean {
	const names = new Set([selector, kebabToPascalCase(selector)]);
	const alternatives = [...names].map(name => name.replaceAll(/[$-]/g, String.raw`\$&`)).join('|');
	return new RegExp(String.raw`(?<![\w$-])(?:${alternatives})(?![\w$-])`).test(sourceCode);
}

/**
 * Groups the file-backed candidates by selector, for the selectors the source text names.
 * A lone candidate is a group too: it may be a package's component that shares the name.
 */
function groupCandidates(pretenders: readonly Pretender[], sourceCode: string): Map<string, Pretender[]> {
	const bySelector = new Map<string, Pretender[]>();
	const named = new Map<string, boolean>();

	for (const pretender of pretenders) {
		if (!pretender.filePath || !RE_SIMPLE_COMPONENT_NAME.test(pretender.selector)) {
			continue;
		}
		let isNamed = named.get(pretender.selector);
		if (isNamed === undefined) {
			isNamed = namesSelector(sourceCode, pretender.selector);
			named.set(pretender.selector, isNamed);
		}
		if (!isNamed) {
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
 * candidates is what the file renders. Returns `null` when nothing confirms a
 * candidate, so the caller leaves the whole group untouched.
 */
function resolveWinner(
	candidates: readonly Pretender[],
	{ filePath, sourceCode, dependencies, cwd }: DisambiguateOptions,
	bindings: readonly ImportBinding[],
): Pretender | typeof FROM_PACKAGE | null {
	const local = candidates.find(c => matchesFile(c.filePath!, filePath));
	if (local) {
		return local;
	}

	const binding = resolveComponentImport(candidates[0]!.selector, bindings);
	if (!binding || binding.type === 'namespace' || binding.type === 'dynamic') {
		return null;
	}

	const resolvedAbs = resolveModule(filePath, binding.source, { sources: undefined, dependencies, cwd });
	if (!resolvedAbs) {
		return null;
	}

	const direct = candidates.find(c => matchesFile(c.filePath!, resolvedAbs));
	if (direct) {
		return direct;
	}
	// A candidate declared in a package (a scan that reached into `node_modules`) is what the
	// file renders when it imports that package: dropping it for the package's sake would drop it
	// for being itself.
	const fromPackage = candidates.some(c =>
		isPackageFile(parsePretenderFilePath(c.filePath!)?.path ?? c.filePath!, cwd),
	)
		? null
		: FROM_PACKAGE;
	// Before the export table: a package's own is not built (see `resolveDeclarationFile`).
	if (isPackageFile(resolvedAbs, cwd)) {
		return fromPackage;
	}

	// The lint target can be part of a re-export chain, so its unsaved text
	// stands in for what is on disk — and it stays out of `dependencies`, as the
	// option promises.
	const targetKey = normalizePath(filePath);
	const sources = new Map([[targetKey, sourceCode]]);
	const read = new Set<string>();
	const declarationAbs = resolveDeclarationFile(resolvedAbs, binding.importedName, {
		sources,
		dependencies: read,
		cwd,
	});
	for (const file of read) {
		if (file !== targetKey) {
			dependencies?.add(file);
		}
	}
	if (!declarationAbs) {
		return null;
	}
	return (
		candidates.find(c => matchesFile(c.filePath!, declarationAbs)) ??
		(isPackageFile(declarationAbs, cwd) ? fromPackage : null)
	);
}

function matchesFile(pretenderFilePath: string, targetAbsPath: string): boolean {
	const pathPart = parsePretenderFilePath(pretenderFilePath)?.path ?? pretenderFilePath;
	return normalizePath(pathPart) === normalizePath(targetAbsPath);
}
