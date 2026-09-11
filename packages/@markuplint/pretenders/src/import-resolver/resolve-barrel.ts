/**
 * @module resolve-barrel
 *
 * Resolves barrel file (index.ts/index.js) re-exports to their original source.
 * Only handles single-level barrel resolution — nested barrel chains are not followed.
 *
 * Given a specifier like `'./components'`, checks if it is a directory with an
 * index file, parses that index file's export statements, and maps the requested
 * binding name back to the original module.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Pattern to match `export { Name } from './source'` or `export { default as Name } from './source'` */
const RE_NAMED_REEXPORT = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/;

/** Index file names to check, in priority order */
const INDEX_FILES = ['index.ts', 'index.js', 'index.mts', 'index.mjs'];

/**
 * Resolves a barrel file re-export to the original source module path.
 *
 * @param specifier - The import specifier (e.g., `'./components'`)
 * @param importedName - The name being imported (e.g., `'Button'`)
 * @param importerPath - The absolute path of the file containing the import
 * @returns The relative source path from the barrel file, or `null` if not a barrel or name not found
 */
export function resolveBarrelExport(specifier: string, importedName: string, importerPath: string): string | null {
	// Only handle relative specifiers
	if (!specifier.startsWith('.')) {
		return null;
	}

	const importerDir = path.dirname(importerPath);
	const resolved = path.resolve(importerDir, specifier);

	// If the specifier points to an existing file, it's not a barrel
	if (isFile(resolved)) {
		return null;
	}

	// Check if the resolved path is a directory with an index file
	const indexPath = findIndexFile(resolved);
	if (!indexPath) {
		return null;
	}

	let indexSource: string;
	try {
		indexSource = fs.readFileSync(indexPath, 'utf8');
	} catch (error: unknown) {
		// eslint-disable-next-line no-console
		console.warn(`Failed to read barrel file: ${indexPath}`, error instanceof Error ? error.message : error);
		return null;
	}
	return matchExportedName(indexSource, importedName);
}

function findIndexFile(dirPath: string): string | null {
	if (!isDirectory(dirPath)) {
		return null;
	}

	for (const name of INDEX_FILES) {
		const candidate = path.join(dirPath, name);
		if (isFile(candidate)) {
			return candidate;
		}
	}

	return null;
}

function matchExportedName(indexSource: string, targetName: string): string | null {
	// Parse named re-exports: `export { X } from '...'` and `export { default as X } from '...'`
	let match: RegExpExecArray | null;
	const namedRe = new RegExp(RE_NAMED_REEXPORT.source, 'g');

	while ((match = namedRe.exec(indexSource)) !== null) {
		const entriesRaw = match[1]!;
		const source = match[2]!;

		for (const entry of entriesRaw.split(',')) {
			const trimmed = entry.trim();
			if (!trimmed) {
				continue;
			}

			const asParts = trimmed.split(/\s+as\s+/);
			// `default as Button` → exported name is `Button`
			// `Button` → exported name is `Button`
			// `Button as Btn` → exported name is `Btn`
			const exportedName = asParts.length === 2 ? asParts[1]!.trim() : trimmed;

			if (exportedName === targetName) {
				return source;
			}
		}
	}

	// Star re-exports: `export * from '...'` — we can't statically verify the name,
	// but for single-level resolution we do not traverse further.
	// Return null since we can't confirm the name exists in the star export.
	return null;
}

function isFile(p: string): boolean {
	try {
		return fs.statSync(p).isFile();
	} catch {
		return false;
	}
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}
