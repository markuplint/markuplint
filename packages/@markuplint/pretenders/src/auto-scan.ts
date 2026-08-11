/**
 * @module auto-scan
 *
 * On-demand pretender resolution: given a single lint target's absolute path
 * and current source text, walks its import graph (breadth-first) to collect
 * the transitively-referenced component files, then scans all of them in one
 * batch. This lets `pretenders: { auto: true }` work without any
 * pre-configured `files`/`scan` glob, at the cost of running a scan per lint
 * target instead of once per project (see `jsx/compiler-host.ts` for the
 * content-based caching that offsets this).
 *
 * Traversal is extension-agnostic — a `.tsx` entry can import a `.vue` file
 * and vice versa, even though TypeScript's own module resolution can't
 * follow into `.vue` (it falls back to a filesystem search; see
 * `resolveModuleFile`). Per-extension scanner dispatch only happens at the
 * final `scan()` call.
 */

import type { Pretender } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';

import { analyzeImports } from './import-resolver/index.js';
import { normalizePath, resolveModuleFile } from './import-resolver/resolve-module-file.js';
import { scan } from './scan.js';

const SCANNABLE_EXTENSIONS = new Set([
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	'.mjs',
	'.cjs',
	'.mts',
	'.cts',
	'.vue',
	'.svelte',
	'.astro',
]);

// Bounds runaway traversal (a deep or wrongly resolved chain) rather than
// expressing a real limit on legitimate component nesting. Note this only
// bounds which files BFS explicitly visits: for JSX/TSX files, jsxScanner
// builds a ts.Program from the collected file list, and TypeScript's own
// module resolution transitively pulls in whatever those files import —
// including files past this depth — so the cap is not a hard ceiling on
// what ends up scanned when the chain is JSX/TSX throughout.
const MAX_DEPTH = 8;

const resultCache = new Map<string, { sourceCode: string; pretenders: Pretender[] }>();

/**
 * Clears the module-level auto-scan result cache. Neither this cache nor the
 * caches it builds on (module resolution, parsed `SourceFile`s, export
 * tables) expire on their own; a long-running host must call
 * `clearPretenderCaches()` (which includes this one) after an edit to any
 * file `autoScan` may have walked.
 */
export function clearAutoScanCache() {
	resultCache.clear();
}

/**
 * Resolves pretenders on demand by scanning `entryAbsPath`'s own import graph:
 * the entry file plus every file it transitively imports (up to a fixed
 * traversal depth), scanned together in one `scan()` call.
 *
 * @param entryAbsPath - Absolute path of the file currently being linted
 * @param sourceCode - The entry file's current text (may be unsaved editor content)
 * @returns Discovered pretender mappings for the entry file and its import graph
 */
export async function autoScan(entryAbsPath: string, sourceCode: string): Promise<Pretender[]> {
	const entryKey = normalizePath(entryAbsPath);

	const cached = resultCache.get(entryKey);
	if (cached && cached.sourceCode === sourceCode) {
		return cached.pretenders;
	}

	const sources = new Map([[entryKey, sourceCode]]);
	const visited = new Set([entryKey]);
	const collected: string[] = [];

	if (isScannable(entryAbsPath)) {
		collected.push(entryAbsPath);
	}

	let frontier: readonly { readonly absPath: string; readonly source: string }[] = [
		{ absPath: entryAbsPath, source: sourceCode },
	];

	for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth++) {
		const nextFrontier: { absPath: string; source: string }[] = [];

		for (const { absPath, source } of frontier) {
			const analysis = await analyzeImports(absPath, source);
			if (!analysis) {
				continue;
			}

			for (const binding of analysis.bindings) {
				const resolved = resolveModuleFile(absPath, binding.source);
				if (!resolved) {
					continue;
				}

				const key = normalizePath(resolved);
				if (visited.has(key) || key.includes('/node_modules/')) {
					continue;
				}
				visited.add(key);

				if (isDeclarationFile(resolved) || !isScannable(resolved)) {
					continue;
				}

				collected.push(resolved);

				const childSource = readFileSafe(resolved);
				if (childSource == null) {
					continue;
				}
				// Feed this read into `sources` so jsxScanner/templateScanner's own
				// file read inside the `scan()` call below reuses it instead of
				// hitting disk again. This doesn't eliminate every re-read for a
				// JSX/TSX file, though: jsxScanner's dependency-mapper module
				// independently re-reads collected files from disk (bypassing
				// `sources`) to build its own export table for same-selector
				// disambiguation (see dependency-mapper.ts's `getExportTableForFile`).
				sources.set(key, childSource);

				nextFrontier.push({ absPath: resolved, source: childSource });
			}
		}

		frontier = nextFrontier;
	}

	const pretenders = await scan(collected, { sources });
	resultCache.set(entryKey, { sourceCode, pretenders });
	return pretenders;
}

function isScannable(filePath: string): boolean {
	return SCANNABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

const DECLARATION_SUFFIXES = ['.d.ts', '.d.mts', '.d.cts'];

function isDeclarationFile(filePath: string): boolean {
	const lower = filePath.toLowerCase();
	return DECLARATION_SUFFIXES.some(suffix => lower.endsWith(suffix));
}

function readFileSafe(filePath: string): string | null {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return null;
	}
}
