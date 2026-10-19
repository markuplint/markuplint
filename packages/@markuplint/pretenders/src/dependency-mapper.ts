import type { PretenderDirectorMap } from './pretender-director.js';
import type { Identifier, Identity, PretenderScanEntry } from './types.js';
import type { ImportBinding } from './import-resolver/types.js';
import type { Pretender } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { isComponentName } from '@markuplint/parser-utils';
import { isFatalError } from '@markuplint/shared';
import ts from 'typescript';

import { composeIdentity } from './compose-identity.js';
import { DEFAULT_LOCAL_NAME, getExportTable } from './export-table.js';
import { scriptKindForPath } from './import-resolver/analyze-jsx-imports.js';
import { resolveComponentImport } from './import-resolver/index.js';
import {
	isPackageSpecifier,
	normalizePath,
	recordDependency,
	resolveModuleFile,
} from './import-resolver/resolve-module-file.js';

import type { ExportEntry } from './export-table.js';

export interface DependencyMapperContext {
	/** Import bindings found in each source file, keyed by the same relative path used as `sourceFile`. */
	readonly importsByFile?: ReadonlyMap<string, readonly ImportBinding[]>;
	/** Base directory that relative `sourceFile` paths (and resolved module paths) are relative to. */
	readonly cwd?: string;
	/**
	 * In-memory content overrides (keyed by normalized absolute path), consulted
	 * before falling back to disk when resolving a chased import's export table.
	 * Without this, a file with unsaved content (e.g. the lint target itself,
	 * when reached via a circular import) resolves against its stale on-disk
	 * version instead — which can silently pick a wrong same-named component
	 * (see the module JSDoc on `getExportTableForFile`).
	 */
	readonly sources?: ReadonlyMap<string, string>;
	/**
	 * A sink for the files read while chasing imports — each export table's file,
	 * and the `tsconfig.json` (with what it `extends`) the imports were resolved
	 * with. See `PretenderScanOptions#dependencies`.
	 */
	readonly dependencies?: Set<string>;
	/**
	 * The file being linted. The names it gives its imports are the names the
	 * pretenders are looked up by at lint time, which the declared names of the
	 * components do not tell: see {@link aliasEntryImports}.
	 */
	readonly entry?: PretenderScanEntry;
}

/**
 * What resolving one hop needs besides the hop itself, passed down as one
 * object so a new input does not touch every signature on the way.
 */
type ResolveEnv = {
	readonly cwd: string;
} & DeclarationEnv;

/**
 * What following re-exports needs: the in-memory overrides of file content, and
 * the sink for the files read on the way. `cwd` is the project root, `undefined`
 * where the caller has none to give ({@link resolveDeclaration} without `cwd`): a
 * file is then judged to be a package's by its whole path, so in a project under
 * `node_modules` a star re-export chain is not followed.
 */
type DeclarationEnv = {
	readonly sources: ReadonlyMap<string, string> | undefined;
	readonly dependencies: Set<string> | undefined;
	readonly cwd: string | undefined;
};

/**
 * The declaration an exported name resolves to. `localName` is `null` for a
 * template component (Vue/Svelte/Astro), which is the file itself.
 */
export type Declaration = {
	readonly fileAbs: string;
	readonly localName: string | null;
	/**
	 * For a default export without a name of its own, the declaration of the binding it
	 * wraps (`memo(Item)`), resolved as far as an import of it leads. Its component is the
	 * one of the default export when the scanner finds none of the default export's own.
	 */
	readonly wraps?: Declaration;
};

/**
 * The declaration and, after it, the ones it wraps, in that order: the declarations whose
 * component can be what an import of `declaration` renders.
 *
 * @param declaration - A resolved declaration
 * @returns `declaration`, then what it wraps
 */
export function declarationChain(declaration: Declaration): readonly Declaration[] {
	const chain: Declaration[] = [];
	for (let current: Declaration | undefined = declaration; current; current = current.wraps) {
		chain.push(current);
	}
	return chain;
}

/**
 * Follows chains where one component wraps another (e.g., MyButton -> Button -> button)
 * until a native element is reached or a cycle is detected.
 *
 * Resolution order at each hop:
 * 1. A same-file local declaration (the file the reference itself lives in).
 * 2. The file's recorded import bindings, resolved to the actual declaration file
 *    via TypeScript module resolution and the target file's export table.
 * 3. The legacy name-based index, for backward compatibility when no file context
 *    is available (or the reference can't be resolved through it). Not for a name
 *    imported from a package: the import says where it leads, so a component of the
 *    project that happens to have the same name is not what it renders. The chain
 *    ends there, as the walk does not enter `node_modules`.
 *
 * (1) and (2) are what let same-named components declared in different files
 * (e.g., two unrelated `Item` components) resolve independently instead of the
 * first-registered one silently winning for every reference — see issue #3951.
 *
 * An import that cannot be resolved still falls back to the name index, as a path alias
 * the module resolution does not know may hide a file of the project, unless it can only
 * be a package that is not installed (see `isPackageSpecifier`, issue #4264). Known
 * limitation: a bare alias that only a bundler knows, not the `tsconfig.json`, is taken
 * for such a package. An import that resolves to a declaration without a component
 * (`@pretends null`, a file name that makes no component name, one the scanner cannot
 * describe) ends the chain instead: a component of the same name elsewhere is not what it
 * renders. A default export without a component of its own resolves to the one of the
 * binding it wraps (`export default memo(Item)`, see `ExportEntry` of `export-table`).
 *
 * Each hop composes the `slots` / `contents` and the attributes of the component so far
 * into those of the component it renders (`composeIdentity`, issue #4057); the rest of the
 * identity is the last hop's.
 *
 * The `filePath` is where the component itself is declared, not where the component it
 * renders is: the lint of a file tells same-named candidates apart by the file it imports the
 * name from (see {@link ./disambiguate.js}), and that is the file that declares the wrapper.
 *
 * With `context.entry`, the pretenders also come under the names the entry file gives its
 * imports (see {@link aliasEntryImports}).
 *
 * `nameIndex` overrides the name index for a test. Without it, the index is built from `map`
 * by {@link buildNameIndex}, which puts a component declared under a name before a default
 * export named after its file; a given index is used as it is.
 */
export function dependencyMapper(
	map: Readonly<PretenderDirectorMap>,
	nameIndex?: Readonly<Map<Identifier, string>>,
	context?: DependencyMapperContext,
): Pretender[] {
	const resolvedNameIndex = nameIndex ?? buildNameIndex(map);
	const importsByFile = context?.importsByFile;
	const cwd = context?.cwd ?? process.cwd();
	const keyOfSameFile = sameFileKeyFinder(map, cwd);
	const env: ResolveEnv = { cwd, sources: context?.sources, dependencies: context?.dependencies };
	const linkedByKey = new Map<string, Pretender>();

	for (const [key, [identifier, _identity, filePath, _sourceFile, localName]] of map) {
		let identity = _identity;
		let elName = getElName(identity);
		let currentFile = _sourceFile;
		const via: string[] = [];
		const visited = new Set<string>([key]);

		while (true) {
			const lookupKey = resolveHop(
				elName,
				currentFile,
				key,
				map,
				importsByFile,
				resolvedNameIndex,
				keyOfSameFile,
				env,
			);
			const mappedPretender = map.get(lookupKey);
			if (!mappedPretender) {
				break;
			}

			if (visited.has(lookupKey)) {
				// Back at a component already passed: the result is that component as it is
				// (the contract the cycle tests pin). Composing once more would hand over what
				// the cycle hands over a second time. A cycle is not valid input, so what the
				// components before it hand over is not worth keeping.
				identity = mappedPretender[1];
				via.push('...[Recursive]');
				break;
			}
			identity = composeIdentity(identity, mappedPretender[1]);
			visited.add(lookupKey);
			via.push(elName);
			elName = getElName(identity);
			currentFile = mappedPretender[3];
		}

		const pretender: Pretender = {
			selector: identifier,
			as: identity,
			...(filePath ? { filePath } : {}),
			...(localName == null ? {} : { localName }),
		};
		if (via.length > 0) {
			Object.assign(pretender, { _via: via });
		}

		linkedByKey.set(key, pretender);
	}

	const aliases = context?.entry ? aliasEntryImports(context.entry, map, linkedByKey, env) : [];

	return [...linkedByKey.values(), ...aliases].toSorted(propSort('selector'));
}

/**
 * The pretenders for the names the entry file gives the components it imports under another
 * name than they are declared by (`import { Named as A }`, `import B from './DefNamed'`, a
 * template component under any name, a re-export renamed by a barrel): the linked pretender of
 * the declaration, under the local name. A name only the importer chooses, so it is the
 * entry's alone. It is not a name that a scan of files could know.
 *
 * It is added even when another component is declared under the local name: the lint then
 * tells them apart by the import, which is why the alias keeps the declaration's own `filePath`,
 * as {@link ./disambiguate.js} matches the file the import leads to against it.
 *
 * A dynamic binding that has a name (`const Foo = lazy(() => import('./Item'))`, see
 * {@link ./import-resolver/dynamic-import-name.js#dynamicImportName}) is aliased like a default
 * import. A namespace is aliased per component it exports, under the member tag (see
 * {@link namespaceMembers}).
 *
 * None for a binding that is assigned to no name, a name that leads into a package (the same-named
 * components of the project are not what it renders, see `FROM_PACKAGE`), and one the map has no
 * component for.
 *
 * None either for a local name that is not a component name (`isComponentName`: no lowercase
 * ASCII initial, or a `.`), whatever it is imported from. A tag written with a lowercase initial is
 * an HTML element in JSX, MDX, Svelte and Astro, so `import myButton from './Foo'` is not what
 * `<myButton>` renders there, and a pretender named `myButton` would turn that element into
 * the component:
 *
 * - React: component names must start with a capital letter; a lowercase tag is an HTML tag
 *   (https://react.dev/learn/your-first-component).
 * - Svelte: a lowercase tag is an HTML element; a capitalised tag or one with dot notation is a
 *   component (https://svelte.dev/docs/svelte/basic-markup).
 * - Astro: a variable used as a tag must be capitalized, or it is rendered as a literal HTML tag
 *   (https://docs.astro.build/en/reference/astro-syntax/).
 *
 * Vue resolves a kebab-case tag to a component imported in PascalCase, and recommends PascalCase
 * (https://vuejs.org/guide/components/registration.html#component-name-casing). The parser of
 * `@markuplint/vue-parser` takes only a capital initial for a component too, so a lowercase local
 * name has no tag to be matched with, and the kebab-case tag of a PascalCase name is not matched
 * either: both are known limitations, to be solved on the side of the tag name, not here.
 */
function aliasEntryImports(
	entry: PretenderScanEntry,
	map: Readonly<PretenderDirectorMap>,
	linkedByKey: ReadonlyMap<string, Pretender>,
	env: ResolveEnv,
): Pretender[] {
	const aliases: Pretender[] = [];
	const aliased = new Set<string>();
	const importerAbs = path.resolve(env.cwd, entry.filePath);

	const addAlias = (selector: string, key: string | typeof FROM_PACKAGE | null) => {
		const declared = typeof key === 'string' ? map.get(key) : undefined;
		const linked = typeof key === 'string' ? linkedByKey.get(key) : undefined;
		if (!declared || !linked || declared[0] === selector || aliased.has(selector)) {
			return;
		}

		aliased.add(selector);
		// A copy, so that the alias and the pretender of the declaration do not share `as` and `_via`.
		aliases.push({ ...structuredClone(linked), selector });
	};

	for (const binding of entry.bindings) {
		const isComponent = binding.type !== 'namespace' && isComponentName(binding.localName);
		const key = isComponent ? resolveImportBinding(binding, importerAbs, env, map) : null;
		// A namespace is no component, so a binding that leads to one is looked at only when it did not.
		const namespaceAbs =
			key == null && binding.type !== 'dynamic' ? namespaceModuleOf(binding, importerAbs, env) : null;
		if (typeof namespaceAbs === 'string') {
			// A member tag is one name that the selector has to be told so: `.` starts a class there.
			for (const member of namespaceMembers(namespaceAbs, env, map)) {
				addAlias(
					[binding.localName, ...member.members].map(escapeSelectorIdent).join(String.raw`\.`),
					member.key,
				);
			}
			continue;
		}

		if (isComponent) {
			addAlias(binding.localName, key);
		}
	}

	return aliases;
}

/**
 * Escapes what is no part of a CSS identifier, so that a name made of identifiers of the source
 * (`UI`, `Item`) is written as one type selector when the pieces are joined by an escaped `.`.
 */
function escapeSelectorIdent(name: string): string {
	return name.replaceAll(/[^\p{ID_Continue}-]/gu, String.raw`\$&`);
}

/**
 * Resolves the map key that `elName` (the current hop's rendered element/component
 * name) should be looked up under, preferring file-context resolution over the
 * flat name index.
 */
function resolveHop(
	elName: string,
	currentFile: string | undefined,
	ownKey: string,
	map: Readonly<PretenderDirectorMap>,
	importsByFile: ReadonlyMap<string, readonly ImportBinding[]> | undefined,
	resolvedNameIndex: Readonly<Map<Identifier, string>>,
	keyOfSameFile: (key: string) => string | undefined,
	env: ResolveEnv,
): string {
	if (currentFile) {
		const sameFileKey = `${currentFile}#${elName}`;
		if (sameFileKey !== ownKey && map.has(sameFileKey)) {
			return sameFileKey;
		}

		const resolved = resolveThroughImport(elName, currentFile, importsByFile, env, map);
		if (resolved === FROM_PACKAGE) {
			// A name that no key stands for: the chain ends here.
			return elName;
		}
		if (resolved != null) {
			// The key, or the key of the same file spelled otherwise (see `sameFileKeyFinder`).
			// Else a declaration that has no component (`@pretends null`, a file name that makes
			// no component name, or one the scanner cannot describe): no other key stands for it,
			// so the chain ends here.
			return map.has(resolved) ? resolved : (keyOfSameFile(resolved) ?? elName);
		}
	}

	const byName = resolvedNameIndex.get(elName);
	const byNameEntry = byName == null ? undefined : map.get(byName);
	// A tag of a file never names the default export without a name of that file itself.
	if (byNameEntry?.[4] === DEFAULT_LOCAL_NAME && byNameEntry[3] === currentFile) {
		return elName;
	}
	return byName ?? elName;
}

/**
 * Finds the key of `map` for the same declaration in the same file as `key`, the file spelled
 * otherwise: an import can name a file by another case than the scan found it by, on a
 * case-insensitive file system, or through a symbolic link. The files are compared by their
 * real paths, so two files of a case-sensitive file system stay two. The real paths of the keys
 * are taken on the first miss only.
 */
function sameFileKeyFinder(map: Readonly<PretenderDirectorMap>, cwd: string): (key: string) => string | undefined {
	let byRealPath: Map<string, string> | undefined;
	const realCwd = realPathOf(cwd) ?? cwd;
	const realKey = (key: string) => {
		const hash = key.lastIndexOf('#');
		const file = hash === -1 ? key : key.slice(0, hash);
		const real = realPathOf(path.resolve(cwd, file));
		return real == null ? undefined : normalizePath(path.relative(realCwd, real)) + key.slice(file.length);
	};
	return key => {
		byRealPath ??= new Map(
			[...map.keys()].flatMap(mapKey => {
				const real = realKey(mapKey);
				return real == null ? [] : [[real, mapKey] as const];
			}),
		);
		const real = realKey(key);
		return real == null ? undefined : byRealPath.get(real);
	};
}

/**
 * The real path of a file, spelled as the file system has it, or `undefined` when it does not exist.
 */
function realPathOf(filePath: string): string | undefined {
	try {
		return fs.realpathSync.native(filePath);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return undefined;
	}
}

/**
 * How many files one chain of re-exports (`export { X } from`, `export * from`,
 * `export * as X from`) may pass to find where a name is declared, the file that declares it
 * included: a name behind 7 re-exports is found and one behind 8 is not. It stops a cycle or a
 * runaway chain and is not a measured limit: a barrel nested this deep is not expected. A name
 * beyond it is treated as one that cannot be resolved. It is not the `depth` of `pretenders.auto`,
 * which counts the import hops of the walk.
 */
const MAX_RE_EXPORT_DEPTH = 8;

/**
 * What {@link resolveThroughImport} and the lint-time disambiguation ({@link ./disambiguate.js})
 * return for a name that is imported from a package (a file under `node_modules`), as no key of the
 * map and no candidate can stand for it. Unlike `null` ("could not confirm"), it rules out the
 * name-based fallback. One symbol for both, so that a result passed from one to the other is told.
 */
export const FROM_PACKAGE = Symbol('from-package');

/**
 * Whether the file is under a `node_modules` directory. With `root` (the base directory
 * of the paths the project is scanned under), only the part of the path below it counts,
 * so a project that itself sits under `node_modules` is not taken for a package.
 *
 * It judges the path as given, so it takes the real path that {@link resolveModule} returns.
 *
 * @param fileAbs - Absolute path of the file
 * @param root - The base directory of the paths the project is scanned under
 * @returns `true` if the file is under a `node_modules` directory below `root`
 */
export function isPackageFile(fileAbs: string, root?: string): boolean {
	const target = root === undefined ? fileAbs : path.relative(root, fileAbs);
	return `/${normalizePath(target)}`.includes('/node_modules/');
}

/**
 * {@link resolveModuleFile} with the symlinks followed. A workspace package is linked into
 * `node_modules`: module resolution gives its real path by default, but with `preserveSymlinks`
 * it keeps the path under `node_modules`, where it would be taken for an installed package
 * and would not match the map's keys. Only a path that looks like a package's is followed: any
 * other is left as it is, as the project root is not necessarily a real path (`os.tmpdir()` is a
 * link on macOS), and so is a path that does not exist. A real path below the root is returned
 * as a path below the root as it is written, so the keys of the map, made from it, still match.
 * `native` is what TypeScript uses: on Windows it also expands a short `8.3` name, which the
 * other one leaves in the target of a junction.
 *
 * A package that is not installed (see {@link isPackageSpecifier}) gets the path it would have if
 * it were: under `node_modules` next to the importer. It names no file, but it is judged by
 * {@link isPackageFile} as any package is, so the chain ends there instead of falling back to a
 * same-named component of the project (issue #4264).
 */
export function resolveModule(importerAbs: string, source: string, env: DeclarationEnv): string | null {
	const resolved = resolveModuleFile(importerAbs, source, env.dependencies);
	if (!resolved) {
		return isPackageSpecifier(importerAbs, source, env.dependencies)
			? normalizePath(path.join(path.dirname(importerAbs), 'node_modules', source))
			: null;
	}
	if (!isPackageFile(resolved, env.cwd)) {
		return resolved;
	}
	try {
		const real = fs.realpathSync.native(resolved);
		if (env.cwd === undefined) {
			return normalizePath(real);
		}
		const below = path.relative(fs.realpathSync.native(env.cwd), real);
		return normalizePath(below.startsWith('..') || path.isAbsolute(below) ? real : path.join(env.cwd, below));
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return resolved;
	}
}

/**
 * Resolves `elName` through the import bindings recorded for `currentFile`,
 * returning the map key of the file/name it actually refers to, or `null`
 * when it can't be confirmed (a bare namespace name, a dynamic import that is not assigned to
 * a name, unresolved modules, or export tables that don't confirm the binding). A dynamic import
 * that is (`const X = lazy(() => import('./X'))`) is resolved like a default import. A member tag
 * (`UI.Item`, `UI.Sub.Item`) is resolved through the namespace its first name stands for: the
 * module of `import * as UI`, or the one a re-export names (see {@link resolveMemberTag}). `FROM_PACKAGE`
 * when it is confirmed to lead into a package, directly or through a re-export:
 * unlike `null`, it rules out the name-based fallback.
 */
function resolveThroughImport(
	elName: string,
	currentFile: string,
	importsByFile: ReadonlyMap<string, readonly ImportBinding[]> | undefined,
	env: ResolveEnv,
	map: Readonly<PretenderDirectorMap>,
): string | typeof FROM_PACKAGE | null {
	const bindings = importsByFile?.get(currentFile);
	if (!bindings) {
		return null;
	}

	const binding = resolveComponentImport(elName, bindings);
	if (binding) {
		return binding.type === 'namespace'
			? null
			: resolveImportBinding(binding, path.resolve(env.cwd, currentFile), env, map);
	}

	// A name that no binding has as a whole may be a member tag: `UI.Item`, the name `UI` and what follows.
	const [head = '', ...members] = elName.split('.');
	const memberBinding = members.length > 0 ? resolveComponentImport(head, bindings) : undefined;
	return memberBinding && memberBinding.type !== 'dynamic'
		? resolveMemberTag(memberBinding, members, path.resolve(env.cwd, currentFile), env, map)
		: null;
}

/**
 * Resolves a member tag (`UI.Sub.Item`, the `members` after the name `binding` imports) to the map
 * key of the component it names, through the namespaces the binding and the re-exports lead to. The
 * result is what {@link resolveThroughImport} says of it.
 */
function resolveMemberTag(
	binding: ImportBinding,
	members: readonly string[],
	importerAbs: string,
	env: ResolveEnv,
	map: Readonly<PretenderDirectorMap>,
): string | typeof FROM_PACKAGE | null {
	let current: string | typeof FROM_PACKAGE | null = namespaceModuleOf(binding, importerAbs, env);
	// One chain for all the members, as `namespaceMembers` counts the files of one chain.
	const visited = new Set<string>();
	for (const member of members.slice(0, -1)) {
		current = typeof current === 'string' ? namespaceOfExport(current, member, visited, env) : current;
	}
	if (current === FROM_PACKAGE) {
		return FROM_PACKAGE;
	}
	const last = members.at(-1);
	const declaration = current && last ? resolveExportedName(current, last, visited, env) : null;
	if (!declaration) {
		return null;
	}
	return isPackageFile(declaration.fileAbs, env.cwd) ? FROM_PACKAGE : keyOfDeclaration(declaration, env, map);
}

/**
 * The module a binding stands for as a namespace: the module of `import * as UI`, or the module
 * that `export * as UI from` (or `import * as UI; export { UI }`) of the imported one names, for a
 * named or default import of it. `null` for a binding that is no namespace, and for a template
 * component, which has no member to name; `FROM_PACKAGE` for one that is a package's namespace.
 */
function namespaceModuleOf(
	binding: ImportBinding,
	importerAbs: string,
	env: ResolveEnv,
): string | typeof FROM_PACKAGE | null {
	const moduleAbs = resolveModule(importerAbs, binding.source, env);
	if (moduleAbs && isPackageFile(moduleAbs, env.cwd)) {
		return FROM_PACKAGE;
	}
	if (!isScannedModule(moduleAbs, env)) {
		return null;
	}
	return binding.type === 'namespace'
		? moduleAbs
		: namespaceOfExport(moduleAbs, binding.importedName, new Set(), env);
}

/** A module whose export table is read: not a package's, and not a template component (`default` only). */
function isScannedModule(fileAbs: string | null, env: DeclarationEnv): fileAbs is string {
	return fileAbs != null && !isPackageFile(fileAbs, env.cwd) && !isTemplateComponentFile(fileAbs);
}

/**
 * The module that `exportedName` of `fileAbs` stands for as a namespace, following the re-exports
 * (`export * as Sub from`, a name of a star re-export) up to the same depth as
 * {@link resolveExportedName}. `null` when it is no namespace, `FROM_PACKAGE` when it is one of a
 * package.
 */
function namespaceOfExport(
	fileAbs: string,
	exportedName: string,
	visited: Set<string>,
	env: DeclarationEnv,
): string | typeof FROM_PACKAGE | null {
	const visitKey = `${fileAbs}#${exportedName}`;
	if (visited.size >= MAX_RE_EXPORT_DEPTH || visited.has(visitKey)) {
		return null;
	}
	visited.add(visitKey);

	const table = getExportTableForFile(fileAbs, env);
	if (!table) {
		return null;
	}
	const entry = table.byName.get(exportedName);
	if (!entry) {
		// As in ECMAScript, `default` never passes through `export *`, and a name that two of them
		// supply differently is ambiguous. A package is not searched: the name may come from it, which
		// `fromPackage` stands for if no other star supplies it (see `resolveThroughStarReExports`).
		let found: string | null = null;
		let fromPackage = false;
		for (const source of exportedName === 'default' ? [] : table.starReExportSources) {
			const nextAbs = resolveModule(fileAbs, source, env);
			if (nextAbs && isPackageFile(nextAbs, env.cwd)) {
				fromPackage = true;
				continue;
			}
			if (!isScannedModule(nextAbs, env)) {
				continue;
			}
			const next = namespaceOfExport(nextAbs, exportedName, new Set(visited), env);
			if (next === FROM_PACKAGE) {
				fromPackage = true;
			} else if (next != null) {
				if (found != null && found !== next) {
					return null;
				}
				found = next;
			}
		}
		return found ?? (fromPackage ? FROM_PACKAGE : null);
	}
	if (entry.kind !== 're-export') {
		return null;
	}

	const nextAbs = resolveModule(fileAbs, entry.source, env);
	if (nextAbs && isPackageFile(nextAbs, env.cwd)) {
		return FROM_PACKAGE;
	}
	if (!isScannedModule(nextAbs, env)) {
		return null;
	}
	return entry.importedName === '*' ? nextAbs : namespaceOfExport(nextAbs, entry.importedName, visited, env);
}

/**
 * The components a namespace exports (`import * as UI`, a named import of a namespace the module
 * exports with `export * as UI from`, or with `import * as UI; export { UI }`), each as the names
 * that lead to it (`['Item']`, or `['Sub', 'Item']` below a nested namespace) and the map key of its
 * declaration. A name that two star re-exports supply differently is left out, as
 * {@link resolveThroughStarReExports} does; a name the module declares itself wins over a star's,
 * as in ECMAScript.
 *
 * A component is used through the namespace as the member tag `UI.Item` (`UI.Sub.Item`). A tag with
 * a dot is a component whatever the case of its first letter in JSX, Svelte and MDX
 * (https://legacy.reactjs.org/docs/jsx-in-depth.html#using-dot-notation-for-jsx-type,
 * https://svelte.dev/docs/svelte/basic-markup), so the namespace's own name is not judged. Vue
 * and Astro take only a capital initial for a component: there an alias under a lowercase
 * namespace name is made and matches no tag.
 *
 * A pretender for it is selected by the name written with `\.` (see {@link escapeSelectorIdent}):
 * a selector is CSS, where `UI.Item` is the type `UI` with the class `Item`, and `UI\.Item` is the
 * one name of the tag.
 */
function namespaceMembers(
	moduleAbs: string,
	env: ResolveEnv,
	map: Readonly<PretenderDirectorMap>,
): { readonly members: readonly string[]; readonly key: string }[] {
	const found = new Map<string, { members: string[]; key: string | null }>();
	// The names (members, or a nested namespace) that the module declares itself, which a star's does not replace.
	const ownIds = new Set<string>();
	// The module that a star re-export gives a nested namespace, `null` once two give it differently.
	const starNamespaces = new Map<string, string | null>();

	const collect = (fileAbs: string, prefix: readonly string[], visited: ReadonlySet<string>, own: boolean) => {
		const table = getExportTableForFile(fileAbs, env);
		if (!table || visited.has(fileAbs) || visited.size >= MAX_RE_EXPORT_DEPTH) {
			return;
		}
		const chain = new Set(visited).add(fileAbs);

		for (const [name, entry] of table.byName) {
			const members = [...prefix, name];
			const id = members.join('.');
			if (name === 'default') {
				continue;
			}
			if (own) {
				ownIds.add(id);
			} else if (ownIds.has(id)) {
				continue;
			}

			if (entry.kind === 're-export' && entry.importedName === '*') {
				const nextAbs = resolveModule(fileAbs, entry.source, env);
				if (!isScannedModule(nextAbs, env)) {
					continue;
				}
				if (!own) {
					const previous = starNamespaces.get(id);
					starNamespaces.set(id, previous === undefined || previous === nextAbs ? nextAbs : null);
					if (previous === nextAbs) {
						continue;
					}
				}
				collect(nextAbs, members, chain, own);
				continue;
			}

			const declaration = resolveExportedName(fileAbs, name, new Set(), env);
			const key =
				declaration && !isPackageFile(declaration.fileAbs, env.cwd)
					? keyOfDeclaration(declaration, env, map)
					: null;
			const previous = found.get(id);
			found.set(id, { members, key: previous && !own && previous.key !== key ? null : key });
		}
		for (const source of table.starReExportSources) {
			const nextAbs = resolveModule(fileAbs, source, env);
			if (isScannedModule(nextAbs, env)) {
				collect(nextAbs, prefix, chain, false);
			}
		}
	};
	collect(moduleAbs, [], new Set(), true);

	const ambiguous = [...starNamespaces].flatMap(([id, from]) => (from == null ? [id] : []));
	return [...found].flatMap(([id, { members, key }]) =>
		key == null || ambiguous.some(name => id.startsWith(`${name}.`)) ? [] : [{ members, key }],
	);
}

/**
 * Resolves one import binding of the file at `importerAbs` to the map key of the declaration
 * it leads to. The result is what {@link resolveThroughImport} says of it.
 */
function resolveImportBinding(
	binding: ImportBinding,
	importerAbs: string,
	env: ResolveEnv,
	map?: Readonly<PretenderDirectorMap>,
): string | typeof FROM_PACKAGE | null {
	const resolvedAbs = resolveModule(importerAbs, binding.source, env);
	if (!resolvedAbs) {
		return null;
	}
	// Before the export table: a package's own is not built (see `resolveThroughStarReExports`).
	if (isPackageFile(resolvedAbs, env.cwd)) {
		return FROM_PACKAGE;
	}

	const declaration = isTemplateComponentFile(resolvedAbs)
		? { fileAbs: resolvedAbs, localName: null }
		: resolveExportedName(resolvedAbs, binding.importedName, new Set(), env);
	if (declaration && isPackageFile(declaration.fileAbs, env.cwd)) {
		return FROM_PACKAGE;
	}
	if (!declaration) {
		return null;
	}
	return keyOfDeclaration(declaration, env, map);
}

/**
 * The map key of a declaration: its own, or for a default export without a component of its own,
 * the key of what it wraps, if that has one. Without `map` the declaration's own.
 */
function keyOfDeclaration(declaration: Declaration, env: ResolveEnv, map?: Readonly<PretenderDirectorMap>): string {
	const key = declarationKey(declaration, env.cwd);
	if (!map) {
		return key;
	}
	for (const wrapped of declarationChain(declaration)) {
		const wrappedKey = declarationKey(wrapped, env.cwd);
		if (map.has(wrappedKey)) {
			return wrappedKey;
		}
	}
	return key;
}

/**
 * The file of {@link resolveDeclaration}.
 *
 * @param fileAbs - Absolute path of the module the name is imported from
 * @param exportedName - The imported name (`'default'` for a default import)
 * @param options - As {@link resolveDeclaration} takes them
 * @returns The declaring file's absolute path, or `null` where {@link resolveDeclaration} returns `null`
 */
export function resolveDeclarationFile(
	fileAbs: string,
	exportedName: string,
	options?: {
		readonly sources?: ReadonlyMap<string, string>;
		readonly dependencies?: Set<string>;
		readonly cwd?: string;
	},
): string | null {
	return resolveDeclaration(fileAbs, exportedName, options)?.fileAbs ?? null;
}

/**
 * Resolves `exportedName` of the module at `fileAbs` to the declaration it stands for: the
 * file that declares it and its local name there (matched against `Pretender.localName`),
 * following re-exports the same way scan-time resolution does (`export { X } from`,
 * `export * from`, and a binding the module imports and exports again). For a default export
 * without a name of its own, `wraps` is the declaration of what it wraps.
 *
 * Returns `null` when that cannot be confirmed: an unreadable file, a name the export tables do
 * not confirm, a namespace re-export, or a name that two star re-exports supply differently.
 *
 * @param fileAbs - Absolute path of the module the name is imported from
 * @param exportedName - The imported name (`'default'` for a default import)
 * @param options - In-memory content overrides (keyed by normalized absolute path), the dependency
 *   sink, and the project root (see {@link DeclarationEnv})
 * @returns The declaration, or `null`. A name re-exported from a package ends the chain at the
 *   package: the file is under `node_modules` (see {@link resolveModule}), with no local name, and
 *   it names no file when the package is not installed.
 */
export function resolveDeclaration(
	fileAbs: string,
	exportedName: string,
	options?: {
		readonly sources?: ReadonlyMap<string, string>;
		readonly dependencies?: Set<string>;
		readonly cwd?: string;
	},
): Declaration | null {
	if (isTemplateComponentFile(fileAbs)) {
		return { fileAbs, localName: null };
	}
	const env: DeclarationEnv = {
		sources: options?.sources,
		dependencies: options?.dependencies,
		cwd: options?.cwd,
	};
	return resolveExportedName(fileAbs, exportedName, new Set(), env);
}

const TEMPLATE_COMPONENT_EXTENSIONS = new Set(['.vue', '.svelte', '.astro']);

function isTemplateComponentFile(filePath: string): boolean {
	return TEMPLATE_COMPONENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Template components (Vue/Svelte/Astro) are one-file-one-component: the
 * scanner keys them by file path directly (a {@link Declaration} without a
 * `localName`), not by an exported name, so there is
 * no export table to consult — the resolved file path *is* the key. Every place
 * that resolves a module specifier has to check for this before falling through
 * to export-table lookup, or the SFC's raw text gets parsed as TypeScript in
 * search of a table it can never have.
 */
function declarationKey(declaration: Declaration, cwd: string): string {
	const fileRel = normalizePath(path.relative(cwd, declaration.fileAbs));
	return declaration.localName == null ? fileRel : `${fileRel}#${declaration.localName}`;
}

/**
 * Resolves `exportedName` in the file at `fileAbs` down to a local declaration,
 * following `export { X } from '...'` and `export * from '...'` re-export
 * chains up to a depth limit.
 */
function resolveExportedName(
	fileAbs: string,
	exportedName: string,
	visited: Set<string>,
	env: DeclarationEnv,
): Declaration | null {
	if (visited.size >= MAX_RE_EXPORT_DEPTH) {
		return null;
	}
	const visitKey = `${fileAbs}#${exportedName}`;
	if (visited.has(visitKey)) {
		return null;
	}
	visited.add(visitKey);

	const table = getExportTableForFile(fileAbs, env);
	if (!table) {
		return null;
	}
	const entry = table.byName.get(exportedName);
	if (!entry) {
		return resolveThroughStarReExports(fileAbs, table.starReExportSources, exportedName, visited, env);
	}

	return resolveEntry(fileAbs, entry, visited, env);
}

function resolveEntry(
	fileAbs: string,
	entry: ExportEntry,
	visited: Set<string>,
	env: DeclarationEnv,
): Declaration | null {
	if (entry.kind === 're-export') {
		return resolveReExport(fileAbs, entry, visited, env);
	}
	const wraps = entry.wraps ? resolveEntry(fileAbs, entry.wraps, new Set(visited), env) : null;
	return wraps ? { fileAbs, localName: entry.localName, wraps } : { fileAbs, localName: entry.localName };
}

/**
 * Looks `exportedName` up behind the `export * from '...'` statements of a file
 * that does not export it by name. As in ECMAScript, `default` never passes
 * through `export *`, and a name that two of them supply differently is
 * ambiguous: neither is picked, so the caller falls back as it does for any
 * unconfirmed name. Each branch gets its own copy of `visited`, so that the
 * depth limit counts the hops of one chain and not the breadth of a barrel.
 */
function resolveThroughStarReExports(
	fileAbs: string,
	starSources: readonly string[],
	exportedName: string,
	visited: ReadonlySet<string>,
	env: DeclarationEnv,
): Declaration | null {
	if (exportedName === 'default') {
		return null;
	}

	let found: Declaration | null = null;
	let fromPackage: Declaration | null = null;
	for (const source of starSources) {
		const nextAbs = resolveModule(fileAbs, source, env);
		if (nextAbs && isPackageFile(nextAbs, env.cwd)) {
			// A package holds no scanned component (the walk does not enter `node_modules`
			// either), and its own star re-exports can be wide and deep enough to search on
			// every miss of a name. So it is not searched: the name may come from it, which
			// `fromPackage` stands for if no other star supplies the name.
			fromPackage = { fileAbs: nextAbs, localName: null };
			continue;
		}
		// A template component exports `default` only, which `export *` skips.
		if (!nextAbs || isTemplateComponentFile(nextAbs)) {
			continue;
		}
		const declaration = resolveExportedName(nextAbs, exportedName, new Set(visited), env);
		if (declaration == null) {
			continue;
		}
		if (
			found != null &&
			(normalizePath(found.fileAbs) !== normalizePath(declaration.fileAbs) ||
				found.localName !== declaration.localName)
		) {
			return null;
		}
		found = declaration;
	}
	return found ?? fromPackage;
}

function resolveReExport(
	fileAbs: string,
	entry: Extract<ExportEntry, { kind: 're-export' }>,
	visited: Set<string>,
	env: DeclarationEnv,
): Declaration | null {
	if (entry.importedName === '*') {
		// Namespace re-export target — no single member to pin to.
		return null;
	}

	const nextAbs = resolveModule(fileAbs, entry.source, env);
	if (!nextAbs) {
		return null;
	}

	if (isPackageFile(nextAbs, env.cwd)) {
		// The chain ends at the package, as for a direct import. A package that is not installed has no
		// file to read, and an installed one holds no scanned component (see `resolveThroughStarReExports`).
		return { fileAbs: nextAbs, localName: null };
	}

	if (isTemplateComponentFile(nextAbs)) {
		// A barrel can re-export a template component
		// (`export { Button } from './Button.vue'`). Without this check the chain
		// would try to build an export table from the SFC and fall back to the flat
		// name index, silently resolving to whichever same-named component happened
		// to be registered first — the exact failure issue #3951 fixed for direct
		// imports.
		return { fileAbs: nextAbs, localName: null };
	}

	return resolveExportedName(nextAbs, entry.importedName, visited, env);
}

type ExportTableCacheEntry = {
	/**
	 * The `sources` override text this table was built from, or `null` when it
	 * was built from the file's on-disk content (including a failed read, cached
	 * as a `null` table).
	 */
	readonly sourceText: string | null;
	readonly table: ReturnType<typeof getExportTable> | null;
};

const exportTableCache = new Map<string, ExportTableCacheEntry>();

/**
 * Clears the module-level export-table cache. A table built from a file's
 * on-disk content never expires on its own, so a long-running host (a
 * watch-mode lint run, an editor extension) that keeps resolving pretenders
 * across file edits must call this whenever it re-resolves without cache (e.g.
 * after a file change) — otherwise a renamed or restructured export keeps
 * resolving to what it used to be for the rest of the process's lifetime.
 *
 * Tables built from an in-memory `sources` override are the exception: their
 * text is already in memory, so comparing it costs nothing and they rebuild as
 * soon as it differs.
 */
export function clearExportTableCache() {
	exportTableCache.clear();
}

/**
 * Consults `sources` (an in-memory content override, keyed by normalized
 * absolute path — the same map threaded through from the scanner) before
 * falling back to disk. This matters when a chased import leads back to a
 * file with unsaved content, most commonly the lint target itself reached
 * via a circular import: without `sources`, the export table would be built
 * from the stale on-disk version, and a same-named export it doesn't yet
 * have (or no longer has) can silently resolve through the name-index
 * fallback in `resolveHop` to an unrelated component instead (see issue
 * #3951; this is that same class of bug, reachable via `sources` divergence
 * rather than scan order).
 *
 * The cache is deliberately consulted BEFORE any filesystem access. This runs
 * once per component reference per resolution hop, not once per file, so
 * reading first in order to compare content would leave the cache unable to
 * prevent any I/O at all — one `readFileSync` per reference instead of one per
 * file, which on a project where many components import from one shared barrel
 * turns a single read into hundreds per `getPretenders()` call.
 *
 * That call frequency is also why this is NOT shared with the structurally
 * similar cached reader in `jsx/compiler-host.ts`, tempting as that looks. That
 * one is called once per file per `ts.Program`, so it can afford to read first
 * and compare content, which buys it automatic freshness. Forcing either policy
 * on both would mean giving up freshness there or paying per-reference I/O here.
 * The two look alike but answer different questions; keep them separate.
 */
function getExportTableForFile(fileAbs: string, env: DeclarationEnv) {
	const key = normalizePath(fileAbs);
	// Recorded before the cache is consulted: a hit reads nothing, yet the result
	// still depends on this file.
	recordDependency(env.dependencies, key);
	const overrideText = env.sources?.get(key);
	const cached = exportTableCache.get(key);

	if (cached && cached.sourceText === (overrideText ?? null)) {
		return cached.table;
	}

	let text: string;
	if (overrideText === undefined) {
		try {
			text = fs.readFileSync(fileAbs, 'utf8');
		} catch (error) {
			if (isFatalError(error)) {
				throw error;
			}
			// Memoize the failure. A file can resolve (so it reaches here) yet be
			// unreadable — a permission-restricted vendored component, a Windows
			// EPERM/EBUSY, a file a concurrent build just removed. Without this,
			// every reference to it re-attempts the syscall on every hop.
			exportTableCache.set(key, { sourceText: null, table: null });
			return null;
		}
	} else {
		text = overrideText;
	}

	const table = buildExportTable(fileAbs, text);
	exportTableCache.set(key, { sourceText: overrideText ?? null, table });
	return table;
}

/**
 * A parse-stage failure must degrade to "no export table" rather than abort the
 * caller: resolution then falls back to the name index, and the file being
 * linted still gets its real violations reported. TypeScript's parser can raise
 * a plain `Error` (an internal assertion on pathological or generated input),
 * which would otherwise propagate all the way out of the lint run.
 */
function buildExportTable(fileAbs: string, text: string) {
	try {
		const sourceFile = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true, scriptKindForPath(fileAbs));
		return getExportTable(sourceFile);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return null;
	}
}

/**
 * For backward-compatible name-based lookup.
 * First definition wins when multiple entries share the same identifier, except that a
 * component declared under the name comes before a default export named after its file,
 * which a tag can only name through an import of that default export.
 */
function buildNameIndex(map: Readonly<PretenderDirectorMap>): Map<Identifier, string> {
	const index = new Map<Identifier, string>();
	for (const [key, entry] of map) {
		const [identifier] = entry;
		const indexed = index.get(identifier);
		if (indexed == null || (map.get(indexed)?.[4] === DEFAULT_LOCAL_NAME && entry[4] !== DEFAULT_LOCAL_NAME)) {
			index.set(identifier, key);
		}
	}
	return index;
}

function getElName(identity: Identity) {
	if (typeof identity === 'string') {
		return identity;
	}
	return identity.element;
}

/**
 * Comparator that sorts by `propName`, case-insensitive for string values.
 */
export function propSort<T, P extends keyof T>(propName: P) {
	return (a: T, b: T) => {
		const nameA = toLowerCase(a[propName]);
		const nameB = toLowerCase(b[propName]);
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		return 0;
	};
}

function toLowerCase<T>(value: T): T {
	if (typeof value === 'string') {
		return value.toLowerCase() as T;
	}
	return value;
}
