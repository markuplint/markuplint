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
import { normalizePath, recordDependency, resolveModuleFile } from './import-resolver/resolve-module-file.js';
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
// expressing a real limit on legitimate component nesting; the value itself
// was picked without a measured basis, which is why `pretenders.auto` lets
// a config override it. The limit holds for every file type because the
// final `scan()` is told not to follow imports (`followImports: false`):
// otherwise jsxScanner's ts.Program would pull in whatever the collected
// files import, past this depth.
const DEFAULT_DEPTH = 8;

/**
 * Options of {@link autoScan}.
 */
export interface AutoScanOptions {
	/**
	 * How many import hops from the entry file are followed. `0` scans only
	 * the entry file. Defaults to `8`.
	 *
	 * Not validated here (the config schema validates `pretenders.auto.depth`):
	 * a negative number or `NaN` behaves like `0`, and a fraction is rounded up.
	 */
	readonly depth?: number;

	/**
	 * A sink for the files the result depends on (see
	 * `PretenderScanOptions#dependencies`), the entry file included — the
	 * caller already holds it and skips it. A cached result reports the files
	 * it was computed from, the same as a fresh one.
	 */
	readonly dependencies?: Set<string>;
}

const resultCache = new Map<
	string,
	{ sourceCode: string; depth: number; pretenders: Pretender[]; dependencies: ReadonlySet<string> }
>();

/**
 * Clears the module-level auto-scan result cache. This cache is keyed on the
 * ENTRY file's path and content only, so an edit to any other file in the
 * entry's import graph does not invalidate it — a long-running host must call
 * `clearPretenderCaches()` (which includes this one) after an edit to any file
 * `autoScan` may have walked, not just after an edit to the entry itself. Those
 * files are what {@link AutoScanOptions.dependencies} reports.
 */
export function clearAutoScanCache() {
	resultCache.clear();
}

/**
 * Resolves pretenders on demand by scanning `entryAbsPath`'s own import graph:
 * the entry file plus every file it transitively imports (up to
 * `options.depth` hops), scanned together in one `scan()` call.
 *
 * @param entryAbsPath - Absolute path of the file currently being linted
 * @param sourceCode - The entry file's current text (may be unsaved editor content)
 * @param options - Traversal options, and where to report the files the result depends on
 * @returns Discovered pretender mappings for the entry file and its import graph
 */
export async function autoScan(
	entryAbsPath: string,
	sourceCode: string,
	options?: AutoScanOptions,
): Promise<Pretender[]> {
	const entryKey = normalizePath(entryAbsPath);
	const maxDepth = options?.depth ?? DEFAULT_DEPTH;

	const cached = resultCache.get(entryKey);
	if (cached && cached.sourceCode === sourceCode && cached.depth === maxDepth) {
		for (const dependency of cached.dependencies) {
			options?.dependencies?.add(dependency);
		}
		return cached.pretenders;
	}

	// Collected here, not into the caller's sink: the cache keeps this set, and a
	// caller's own contents must not be replayed to the next caller.
	const dependencies = new Set<string>();
	const sources = new Map([[entryKey, sourceCode]]);
	const visited = new Set([entryKey]);
	const collected: string[] = [];

	if (isScannable(entryAbsPath)) {
		collected.push(entryAbsPath);
	}

	let frontier: readonly { readonly absPath: string; readonly source: string }[] = [
		{ absPath: entryAbsPath, source: sourceCode },
	];

	for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
		const nextFrontier: { absPath: string; source: string }[] = [];

		for (const { absPath, source } of frontier) {
			const analysis = await analyzeImports(absPath, source);
			if (!analysis) {
				continue;
			}

			for (const binding of analysis.bindings) {
				const resolved = resolveModuleFile(absPath, binding.source, dependencies);
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
				// Before the read: a file that cannot be read now, but comes back, is a change.
				recordDependency(dependencies, resolved);

				const childSource = readFileSafe(resolved);
				if (childSource == null) {
					continue;
				}
				// Feed this read into `sources` so the `scan()` call below reuses it
				// instead of hitting disk again — both the scanners' own file reads
				// and the export-table construction behind same-selector
				// disambiguation consult `sources` first.
				sources.set(key, childSource);

				nextFrontier.push({ absPath: resolved, source: childSource });
			}
		}

		frontier = nextFrontier;
	}

	// `followImports: false`: this walk already decided which files belong, so
	// the TypeScript program must not add more of them (see `DEFAULT_DEPTH`).
	const pretenders = await scan(collected, { sources, followImports: false, dependencies });
	resultCache.set(entryKey, { sourceCode, depth: maxDepth, pretenders, dependencies });
	for (const dependency of dependencies) {
		options?.dependencies?.add(dependency);
	}
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
