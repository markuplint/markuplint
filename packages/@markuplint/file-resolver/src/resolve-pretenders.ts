import type { OptimizedConfig, Pretender, PretenderFileData } from '@markuplint/ml-config';

import path from 'node:path';

import { rebasePretenderFilePath } from '@markuplint/ml-config';
import { glob } from 'glob';

import { generalImport } from './general-import.js';

type PretendersConfig = OptimizedConfig['pretenders'];

/**
 * `Pretender.filePath` is written by scanners relative to their own base
 * directory, which is meaningless once entries from files/scan results
 * scattered across different directories are merged into one flat list.
 * Rebasing to an absolute path immediately after each source is read is
 * what lets {@link disambiguatePretendersForFile} later compare a
 * pretender's origin file against the lint target's resolved imports.
 */
function rebasePretenderFilePaths(pretenders: readonly Pretender[], baseDir: string): Pretender[] {
	return pretenders.map(pretender => rebasePretenderFilePath(pretender, relPath => path.resolve(baseDir, relPath)));
}

/**
 * Resolves pretender definitions from files, imported modules, inline data,
 * and dynamic component scanning in the configuration.
 *
 * Resolution order:
 * 1. `config.files` — direct import of pretender data files
 * 2. `config.imports` — for each module, tries `<module>/package.json`
 *    (reads the `pretenders` field) first, then falls back to
 *    `<module>/pretenders.json`
 * 3. `config.data` — inline pretender definitions
 * 4. `config.scan` — dynamic component scanning via glob patterns
 *    (`files` accepts `string | string[]`)
 *
 * @param config - The pretenders configuration section from the optimized config
 * @returns An array of all resolved pretender definitions
 */
export async function resolvePretenders(config: PretendersConfig): Promise<Pretender[]> {
	if (!config) {
		return [];
	}

	const data: Pretender[] = [];

	if (config.files) {
		for (const file of config.files) {
			const pretenderFile = await generalImport<PretenderFileData>(file);
			if (!pretenderFile?.data) {
				continue;
			}
			// `file` is already absolute (resolved by the config provider), so its
			// own directory is the correct base for the entries it carries.
			data.push(...rebasePretenderFilePaths(pretenderFile.data, path.dirname(file)));
		}
	}

	if (config.imports) {
		for (const module of config.imports) {
			const pretenderFile =
				// eslint-disable-next-line unicorn/no-await-expression-member
				(await generalImport<{ pretenders?: PretenderFileData }>(`${module}/package.json`))?.pretenders ??
				(await generalImport<PretenderFileData>(`${module}/pretenders.json`));
			if (!pretenderFile?.data) {
				continue;
			}
			// The on-disk location of an npm package's pretenders data isn't
			// recoverable from `generalImport`'s return value, so these entries'
			// filePath is left as-is — disambiguation simply can't confirm them
			// (see the module JSDoc for the fallback policy this implies).
			data.push(...pretenderFile.data);
		}
	}

	if (config.data) {
		data.push(...config.data);
	}

	if (config.scan) {
		const { scan } = await import('@markuplint/pretenders');
		for (const entry of config.scan) {
			const patterns = typeof entry.files === 'string' ? [entry.files] : [...entry.files];
			const globResults = await Promise.all(patterns.map(p => glob(p)));
			const resolved = globResults.flat().map(f => path.resolve(f));
			if (resolved.length > 0) {
				const scanned = await scan(resolved, {
					ignoreComponentNames: entry.ignoreComponentNames ? [...entry.ignoreComponentNames] : undefined,
				});
				// `scan()` (with no `cwd` option) reports filePath relative to `process.cwd()`.
				data.push(...rebasePretenderFilePaths(scanned, process.cwd()));
			}
		}
	}

	return data;
}

/**
 * Resolves selector collisions in `pretenders` for the specific file about
 * to be linted, deferring to `@markuplint/pretenders`' `disambiguatePretenders`
 * only when there's actually a same-selector, file-backed collision to
 * resolve — this keeps the common case (no ambiguity) free of both the
 * dynamic import and any file/AST work.
 *
 * @param filePath - Absolute path of the file being linted
 * @param sourceCode - Full source text of the file being linted
 * @param pretenders - The flat pretender list {@link resolvePretenders} produced
 * @returns The disambiguated pretender list, or `pretenders` itself (same
 *   reference) when there was no collision to resolve
 */
export async function disambiguatePretendersForFile(
	filePath: string,
	sourceCode: string,
	pretenders: readonly Pretender[],
): Promise<readonly Pretender[]> {
	if (!hasResolvableCollision(pretenders)) {
		return pretenders;
	}

	const { disambiguatePretenders } = await import('@markuplint/pretenders');
	return disambiguatePretenders(pretenders, { filePath, sourceCode });
}

/**
 * Deliberately gates on selector+filePath duplication alone — NOT on the
 * selector name shape `@markuplint/pretenders`' `disambiguatePretenders`
 * actually resolves (plain identifiers only). Duplicating that name-shape
 * check here would let the two independently maintained filters drift out
 * of sync: if the real filter is ever loosened without updating this one,
 * this fast-path gate would keep skipping the dynamic import for cases the
 * real logic would now handle, silently disabling disambiguation for them.
 * Being a strict superset costs at most an unnecessary dynamic import for
 * selectors the real logic ends up not touching — never a missed one.
 *
 * @param pretenders - The flat pretender list to check
 * @returns `true` if some `selector` is shared by two or more `filePath`-backed entries
 */
export function hasResolvableCollision(pretenders: readonly Pretender[]): boolean {
	const seen = new Set<string>();
	for (const pretender of pretenders) {
		if (!pretender.filePath) {
			continue;
		}
		if (seen.has(pretender.selector)) {
			return true;
		}
		seen.add(pretender.selector);
	}
	return false;
}

/**
 * Clears `@markuplint/pretenders`' module-level import/export resolution
 * caches. Call this whenever a lint host re-resolves config without cache
 * (e.g. watch mode after a file change) — otherwise a renamed export or a
 * newly valid tsconfig `paths` alias keeps resolving as it did before the
 * change for the rest of the process's lifetime. A no-op (not an error) when
 * `@markuplint/pretenders` isn't installed, since nothing has populated its
 * caches in that case either.
 *
 * @returns A promise that resolves once the caches have been cleared
 */
export async function invalidatePretenderResolutionCaches(): Promise<void> {
	const pretendersMod = await import('@markuplint/pretenders').catch(() => null);
	pretendersMod?.clearPretenderCaches();
}
