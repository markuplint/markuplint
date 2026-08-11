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
		// Template components (Vue/Svelte/Astro) are one-file-one-component: the
		// scanner keys them by file path directly, not by an exported name, so
		// there is no export table to consult — the resolved file path *is* the key.
		return normalizePath(path.relative(cwd, resolvedAbs));
	}

	return resolveExportedName(resolvedAbs, binding.importedName, cwd, new Set(), sources);
}

const TEMPLATE_COMPONENT_EXTENSIONS = new Set(['.vue', '.svelte', '.astro']);

function isTemplateComponentFile(filePath: string): boolean {
	return TEMPLATE_COMPONENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
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

	return resolveExportedName(nextAbs, entry.importedName, cwd, visited, sources);
}

const exportTableCache = new Map<string, { text: string; table: ReturnType<typeof getExportTable> | null }>();

/**
 * Clears the module-level export-table cache. Content-based invalidation
 * already reparses any file whose text changed (see `getExportTableForFile`),
 * so this exists only for callers that want to fully release memory between
 * long-running resolution batches.
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
 * rather than scan-order).
 *
 * Cached per file, keyed on content (not mtime, which doesn't exist for
 * unsaved content) so a changed file is rebuilt automatically.
 */
function getExportTableForFile(fileAbs: string, sources: ReadonlyMap<string, string> | undefined) {
	const key = normalizePath(fileAbs);
	const overrideText = sources?.get(key);

	let text: string;
	try {
		text = overrideText ?? fs.readFileSync(fileAbs, 'utf8');
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return null;
	}

	const cached = exportTableCache.get(key);
	if (cached && cached.text === text) {
		return cached.table;
	}

	const sourceFile = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true, scriptKindForPath(fileAbs));
	const table = getExportTable(sourceFile);
	exportTableCache.set(key, { text, table });
	return table;
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
