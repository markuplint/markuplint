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
	const linkedPretenders: Pretender[] = [];

	for (const [key, [identifier, _identity, _filePath, _sourceFile]] of map) {
		let identity = _identity;
		let filePath = _filePath;
		let elName = getElName(identity);
		let currentFile = _sourceFile;
		const via: string[] = [];
		const visited = new Set<string>([key]);

		while (true) {
			const lookupKey = resolveHop(elName, currentFile, key, map, importsByFile, resolvedNameIndex, cwd);
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
): string {
	if (currentFile) {
		const sameFileKey = `${currentFile}#${elName}`;
		if (sameFileKey !== ownKey && map.has(sameFileKey)) {
			return sameFileKey;
		}

		const viaImport = resolveThroughImport(elName, currentFile, importsByFile, cwd);
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

	return resolveExportedName(resolvedAbs, binding.importedName, cwd, new Set());
}

const TEMPLATE_COMPONENT_EXTENSIONS = new Set(['.vue', '.svelte', '.astro']);

function isTemplateComponentFile(filePath: string): boolean {
	return TEMPLATE_COMPONENT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Resolves `exportedName` in the file at `fileAbs` down to a local declaration,
 * following `export { X } from '...'` re-export chains up to a depth limit.
 */
function resolveExportedName(fileAbs: string, exportedName: string, cwd: string, visited: Set<string>): string | null {
	if (visited.size >= MAX_RE_EXPORT_DEPTH) {
		return null;
	}
	const visitKey = `${fileAbs}#${exportedName}`;
	if (visited.has(visitKey)) {
		return null;
	}
	visited.add(visitKey);

	const table = getExportTableForFile(fileAbs);
	const entry = table?.byName.get(exportedName);
	if (!entry) {
		return null;
	}

	const fileRel = normalizePath(path.relative(cwd, fileAbs));

	if (entry.kind === 'local') {
		return `${fileRel}#${entry.localName}`;
	}

	return resolveReExport(fileAbs, entry, cwd, visited);
}

function resolveReExport(
	fileAbs: string,
	entry: Extract<ExportEntry, { kind: 're-export' }>,
	cwd: string,
	visited: Set<string>,
): string | null {
	if (entry.importedName === '*') {
		// Namespace re-export target — no single member to pin to.
		return null;
	}

	const nextAbs = resolveModuleFile(fileAbs, entry.source);
	if (!nextAbs) {
		return null;
	}

	return resolveExportedName(nextAbs, entry.importedName, cwd, visited);
}

const exportTableCache = new Map<string, ReturnType<typeof getExportTable> | null>();

/**
 * Clears the module-level export-table cache. `getExportTableForFile()` never
 * expires an entry on its own, so a long-running host (a watch-mode lint run,
 * an editor extension) that keeps resolving pretenders across file edits must
 * call this whenever it re-resolves without cache (e.g. after a file change)
 * — otherwise a renamed or restructured export keeps resolving to what it
 * used to be for the rest of the process's lifetime.
 */
export function clearExportTableCache() {
	exportTableCache.clear();
}

function getExportTableForFile(fileAbs: string) {
	const cached = exportTableCache.get(fileAbs);
	if (cached !== undefined) {
		return cached;
	}

	let table: ReturnType<typeof getExportTable> | null;
	try {
		const content = fs.readFileSync(fileAbs, 'utf8');
		const sourceFile = ts.createSourceFile(
			fileAbs,
			content,
			ts.ScriptTarget.Latest,
			true,
			scriptKindForPath(fileAbs),
		);
		table = getExportTable(sourceFile);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		table = null;
	}

	exportTableCache.set(fileAbs, table);
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
