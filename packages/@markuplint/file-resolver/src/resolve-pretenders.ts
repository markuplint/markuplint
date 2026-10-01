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
 * The lint target's own identity, needed only to resolve `config.auto`.
 * Omitting this (or omitting `config.auto`) skips auto-resolution entirely,
 * so every other resolution source works exactly as before without it.
 */
export type ResolvePretendersContext = {
	/** Absolute path of the file being linted */
	readonly filePath: string;
	/** Full source text of the file being linted (may be unsaved editor content) */
	readonly sourceCode: string;
};

/**
 * Resolves pretenders for one lint target, across edits of that target.
 *
 * The sections of `config.pretenders` split by what their result depends on.
 * `files`, `imports`, `data`, and `scan` depend on the config and the
 * filesystem only; `auto` depends on the target's own source as well — the
 * import graph it walks starts from the target's import statements. (So does
 * the selector disambiguation the caller runs on the result.) A resolver
 * reads the first group once, on the first `resolve()`, and reads the target
 * on every `resolve()`, so a host that re-resolves after each edit of the
 * target (`MLEngine.setCode`) re-does exactly the part an edit can change.
 * The first group is read again only by a new resolver, which a host creates
 * on each config resolution — a change on disk to a scanned component is
 * therefore picked up with the next config resolution, not with the next
 * edit of the target. See #4064.
 */
export type PretenderResolver = {
	/**
	 * @param context - The lint target's path/source, required only for
	 *   `config.auto`; without it `auto` is skipped, as in {@link resolvePretenders}
	 * @returns All resolved pretender definitions — a new array on every call,
	 *   so the retained target-independent entries are never exposed to mutation
	 */
	resolve(context?: ResolvePretendersContext): Promise<Pretender[]>;
};

/**
 * Creates a {@link PretenderResolver} for `config`. One resolver stands for one
 * resolution of the config: its target-independent entries are read on the
 * first `resolve()` and kept for the resolver's lifetime (a failure there is
 * kept as well — the host's next config resolution creates a new resolver).
 *
 * @param config - The pretenders configuration section from the optimized config
 * @returns The resolver; its `resolve()` yields `[]` when `config` is absent
 */
export function createPretenderResolver(config: PretendersConfig): PretenderResolver {
	let targetIndependent: Promise<Pretender[]> | null = null;

	return {
		async resolve(context) {
			if (!config) {
				return [];
			}

			targetIndependent ??= resolveTargetIndependentPretenders(config);
			const data = [...(await targetIndependent)];

			if (config.auto && context) {
				await appendAutoPretenders(data, context);
			}

			return data;
		},
	};
}

/**
 * Resolves pretender definitions from files, imported modules, inline data,
 * dynamic component scanning, and (when `context` is given) the lint
 * target's own import graph.
 *
 * Resolution order:
 * 1. `config.files` — direct import of pretender data files
 * 2. `config.imports` — for each module, tries `<module>/package.json`
 *    (reads the `pretenders` field) first, then falls back to
 *    `<module>/pretenders.json`
 * 3. `config.data` — inline pretender definitions
 * 4. `config.scan` — dynamic component scanning via glob patterns
 *    (`files` accepts `string | string[]`)
 * 5. `config.auto` — on-demand scan of `context`'s own import graph (requires
 *    `context`; a no-op without it, e.g. when the caller has no lint target yet)
 *
 * Equivalent to one `resolve()` of a fresh {@link createPretenderResolver};
 * a host that resolves the same config repeatedly for one target keeps the
 * resolver instead.
 *
 * @param config - The pretenders configuration section from the optimized config
 * @param context - The lint target's path/source, required only for `config.auto`
 * @returns An array of all resolved pretender definitions
 */
export function resolvePretenders(config: PretendersConfig, context?: ResolvePretendersContext): Promise<Pretender[]> {
	return createPretenderResolver(config).resolve(context);
}

/**
 * Steps 1–4 of {@link resolvePretenders}: the sections whose result does not
 * depend on the lint target.
 */
async function resolveTargetIndependentPretenders(config: NonNullable<PretendersConfig>): Promise<Pretender[]> {
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
 * Step 5 of {@link resolvePretenders}: appends what `config.auto` finds in
 * `context`'s import graph to `data`, the target-independent entries.
 */
async function appendAutoPretenders(data: Pretender[], context: ResolvePretendersContext): Promise<void> {
	const { autoScan } = await import('@markuplint/pretenders');
	const scanned = await autoScan(context.filePath, context.sourceCode);
	// `autoScan()` reports filePath relative to `process.cwd()`, same as `scan()`.
	const rebased = rebasePretenderFilePaths(scanned, process.cwd());
	// `scan` and `auto` can both walk into the same file (e.g. a component
	// `scan`'s glob already covers that `auto`'s import-graph walk also
	// reaches); de-duping on (selector, filePath) keeps that file's entry
	// from appearing twice while still letting a same-selector entry from a
	// genuinely different file through for `disambiguatePretendersForFile`
	// to resolve. `selector` is a markuplint CSS-like selector and can
	// legitimately contain spaces (a descendant combinator), so the pair is
	// joined via `JSON.stringify` rather than a plain-string delimiter —
	// otherwise two distinct (selector, filePath) pairs could concatenate to
	// the same string and be mistaken for a duplicate.
	const dedupeKey = (p: Pretender) => JSON.stringify([p.selector, p.filePath]);
	const seen = new Set(data.filter(p => p.filePath).map(p => dedupeKey(p)));
	for (const pretender of rebased) {
		if (pretender.filePath) {
			const key = dedupeKey(pretender);
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
		}
		data.push(pretender);
	}
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
