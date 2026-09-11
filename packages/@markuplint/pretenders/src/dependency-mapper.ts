import type { PretenderDirectorMap } from './pretender-director.js';
import type { Identifier, Identity } from './types.js';
import type { ImportBinding } from './import-resolver/types.js';
import type { Pretender } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import ts from 'typescript';

import { getExportTable } from './export-table.js';
import { scriptKindForPath } from './import-resolver/analyze-jsx-imports.js';
import { resolveComponentImport } from './import-resolver/index.js';
import { normalizePath, resolveModuleFile } from './import-resolver/resolve-module-file.js';

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
 *    is available (or the reference can't be resolved through it).
 *
 * (1) and (2) are what let same-named components declared in different files
 * (e.g., two unrelated `Item` components) resolve independently instead of the
 * first-registered one silently winning for every reference — see issue #3951.
 */
export function dependencyMapper(
	map: Readonly<PretenderDirectorMap>,
	nameIndex?: Readonly<Map<Identifier, string>>,
	context?: DependencyMapperContext,
): Pretender[] {
	const resolvedNameIndex = nameIndex ?? buildNameIndex(map);
	const importsByFile = context?.importsByFile;
	const cwd = context?.cwd ?? process.cwd();
	const sources = context?.sources;
	const linkedPretenders: Pretender[] = [];

	for (const [key, [identifier, _identity, _filePath, _sourceFile]] of map) {
		let identity = _identity;
		let filePath = _filePath;
		let elName = getElName(identity);
		let currentFile = _sourceFile;
		const via: string[] = [];
		const visited = new Set<string>([key]);

		while (true) {
			const lookupKey = resolveHop(elName, currentFile, key, map, importsByFile, resolvedNameIndex, cwd, sources);
			const mappedPretender = map.get(lookupKey);
			if (!mappedPretender) {
				break;
			}

			identity = mappedPretender[1];
			filePath = mappedPretender[2];

			if (visited.has(lookupKey)) {
				via.push('...[Recursive]');
				break;
			}
			visited.add(lookupKey);
			via.push(elName);
			elName = getElName(identity);
			currentFile = mappedPretender[3];
		}

		const pretender: Pretender = {
			selector: identifier,
			as: identity,
			...(filePath ? { filePath } : {}),
		};
		if (via.length > 0) {
			Object.assign(pretender, { _via: via });
		}

		linkedPretenders.push(pretender);
	}

	return linkedPretenders.toSorted(propSort('selector'));
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
	cwd: string,
	sources: ReadonlyMap<string, string> | undefined,
): string {
	if (currentFile) {
		const sameFileKey = `${currentFile}#${elName}`;
		if (sameFileKey !== ownKey && map.has(sameFileKey)) {
			return sameFileKey;
		}

		const viaImport = resolveThroughImport(elName, currentFile, importsByFile, cwd, sources);
		if (viaImport && map.has(viaImport)) {
			return viaImport;
		}
	}

	return resolvedNameIndex.get(elName) ?? elName;
}

const MAX_RE_EXPORT_DEPTH = 8;

/**
 * Resolves `elName` through the import bindings recorded for `currentFile`,
 * returning the map key of the file/name it actually refers to, or `null`
 * when it can't be confirmed (bare/namespace/dynamic specifiers, unresolved
 * modules, or export tables that don't confirm the binding).
 */
function resolveThroughImport(
	elName: string,
	currentFile: string,
	importsByFile: ReadonlyMap<string, readonly ImportBinding[]> | undefined,
	cwd: string,
	sources: ReadonlyMap<string, string> | undefined,
): string | null {
	const bindings = importsByFile?.get(currentFile);
	if (!bindings) {
		return null;
	}

	const binding = resolveComponentImport(elName, bindings);
	if (!binding || binding.type === 'namespace' || binding.type === 'dynamic') {
		return null;
	}

	const importerAbs = path.resolve(cwd, currentFile);
	const resolvedAbs = resolveModuleFile(importerAbs, binding.source);
	if (!resolvedAbs) {
		return null;
	}

	if (isTemplateComponentFile(resolvedAbs)) {
		return templateComponentKey(resolvedAbs, cwd);
	}

	return resolveExportedName(resolvedAbs, binding.importedName, cwd, new Set(), sources);
}

const TEMPLATE_COMPONENT_EXTENSIONS = new Set(['.vue', '.svelte', '.astro']);

function isTemplateComponentFile(filePath: string): boolean {
	return TEMPLATE_COMPONENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Template components (Vue/Svelte/Astro) are one-file-one-component: the
 * scanner keys them by file path directly, not by an exported name, so there is
 * no export table to consult — the resolved file path *is* the key. Every place
 * that resolves a module specifier has to check for this before falling through
 * to export-table lookup, or the SFC's raw text gets parsed as TypeScript in
 * search of a table it can never have.
 */
function templateComponentKey(fileAbs: string, cwd: string): string {
	return normalizePath(path.relative(cwd, fileAbs));
}

/**
 * Resolves `exportedName` in the file at `fileAbs` down to a local declaration,
 * following `export { X } from '...'` re-export chains up to a depth limit.
 */
function resolveExportedName(
	fileAbs: string,
	exportedName: string,
	cwd: string,
	visited: Set<string>,
	sources: ReadonlyMap<string, string> | undefined,
): string | null {
	if (visited.size >= MAX_RE_EXPORT_DEPTH) {
		return null;
	}
	const visitKey = `${fileAbs}#${exportedName}`;
	if (visited.has(visitKey)) {
		return null;
	}
	visited.add(visitKey);

	const table = getExportTableForFile(fileAbs, sources);
	const entry = table?.byName.get(exportedName);
	if (!entry) {
		return null;
	}

	const fileRel = normalizePath(path.relative(cwd, fileAbs));

	if (entry.kind === 'local') {
		return `${fileRel}#${entry.localName}`;
	}

	return resolveReExport(fileAbs, entry, cwd, visited, sources);
}

function resolveReExport(
	fileAbs: string,
	entry: Extract<ExportEntry, { kind: 're-export' }>,
	cwd: string,
	visited: Set<string>,
	sources: ReadonlyMap<string, string> | undefined,
): string | null {
	if (entry.importedName === '*') {
		// Namespace re-export target — no single member to pin to.
		return null;
	}

	const nextAbs = resolveModuleFile(fileAbs, entry.source);
	if (!nextAbs) {
		return null;
	}

	if (isTemplateComponentFile(nextAbs)) {
		// A barrel can re-export a template component
		// (`export { Button } from './Button.vue'`). Without this check the chain
		// would try to build an export table from the SFC and fall back to the flat
		// name index, silently resolving to whichever same-named component happened
		// to be registered first — the exact failure issue #3951 fixed for direct
		// imports.
		return templateComponentKey(nextAbs, cwd);
	}

	return resolveExportedName(nextAbs, entry.importedName, cwd, visited, sources);
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
function getExportTableForFile(fileAbs: string, sources: ReadonlyMap<string, string> | undefined) {
	const key = normalizePath(fileAbs);
	const overrideText = sources?.get(key);
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
 * First definition wins when multiple entries share the same identifier.
 */
function buildNameIndex(map: Readonly<PretenderDirectorMap>): Map<Identifier, string> {
	const index = new Map<Identifier, string>();
	for (const [key, [identifier]] of map) {
		if (!index.has(identifier)) {
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
