import type { OptimizedConfig, Pretender, PretenderAutoOptions, PretenderFileData } from '@markuplint/ml-config';

import path from 'node:path';

import { rebaseHandWrittenPretenderFilePath, rebasePretenderFilePath } from '@markuplint/ml-config';
import { glob } from 'glob';

import { generalImport } from './general-import.js';
import { normalizeForGlob } from './path-utils.js';

type PretendersConfig = OptimizedConfig['pretenders'];

/**
 * `Pretender.filePath` is written by scanners (and by hand, in `data`) relative to
 * their own base directory, which is meaningless once entries from
 * files/scan results/configurations scattered across different directories are
 * merged into one flat list.
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
 * Where a resolution reports what it read.
 */
export type ResolvePretendersOptions = {
	/**
	 * A sink the resolution adds to: the normalized (`/`-delimited) absolute
	 * paths of the files whose content its result depends on, which a
	 * watch-mode host watches to learn when to resolve again (#4065). It covers
	 * what `config.scan` and `config.auto` read, and — for
	 * {@link disambiguatePretendersForFile} — the `tsconfig.json` the target's
	 * imports were resolved with. The lint target itself is not excluded; the
	 * caller already holds it.
	 *
	 * Not covered, because a change to them is not picked up even by resolving
	 * again: `config.files` and `config.imports` (`generalImport` keeps what it
	 * loaded for the life of the process). For what else is out of reach, see
	 * `PretenderScanOptions#dependencies` in `@markuplint/ml-config`.
	 */
	readonly dependencies?: Set<string>;
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
 *
 * A watch-mode host closes that gap by watching the files `resolve()` reports
 * in {@link ResolvePretendersOptions.dependencies}: a change to one of them
 * makes it resolve the config again, which creates the new resolver. See #4065.
 */
export type PretenderResolver = {
	/**
	 * @param context - The lint target's path/source, required only for
	 *   `config.auto`; without it `auto` is skipped, as in {@link resolvePretenders}
	 * @param options - Where to report the files the result depends on. The
	 *   retained target-independent entries report theirs on every call, not
	 *   only on the call that read them.
	 * @returns All resolved pretender definitions — a new array on every call,
	 *   so the retained target-independent entries are never exposed to mutation
	 */
	resolve(context?: ResolvePretendersContext, options?: ResolvePretendersOptions): Promise<Pretender[]>;
};

/**
 * What the target-independent sections yield, with the files they were read from.
 */
type TargetIndependentResult = {
	readonly pretenders: readonly Pretender[];
	readonly dependencies: ReadonlySet<string>;
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
	// The promise is retained, not its result, so that overlapping first calls
	// share one read, and the files it was read from ride along with the result.
	let targetIndependent: Promise<TargetIndependentResult> | null = null;

	return {
		async resolve(context, options) {
			if (!config) {
				return [];
			}

			targetIndependent ??= resolveTargetIndependentPretenders(config);
			const retained = await targetIndependent;
			const data = [...retained.pretenders];
			for (const dependency of retained.dependencies) {
				options?.dependencies?.add(dependency);
			}

			if (config.auto && context) {
				await appendAutoPretenders(data, context, config.auto, options?.dependencies);
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
 * 5. `config.auto` — on-demand scan of `context`'s own import graph, up to
 *    `config.auto.depth` hops when the object form gives one (requires
 *    `context`; a no-op without it, e.g. when the caller has no lint target yet)
 *
 * Equivalent to one `resolve()` of a fresh {@link createPretenderResolver};
 * a host that resolves the same config repeatedly for one target keeps the
 * resolver instead.
 *
 * @param config - The pretenders configuration section from the optimized config
 * @param context - The lint target's path/source, required only for `config.auto`
 * @param options - Where to report the files the result depends on
 * @returns An array of all resolved pretender definitions
 */
export function resolvePretenders(
	config: PretendersConfig,
	context?: ResolvePretendersContext,
	options?: ResolvePretendersOptions,
): Promise<Pretender[]> {
	return createPretenderResolver(config).resolve(context, options);
}

/**
 * Steps 1–4 of {@link resolvePretenders}: the sections whose result does not
 * depend on the lint target.
 */
async function resolveTargetIndependentPretenders(
	config: NonNullable<PretendersConfig>,
): Promise<TargetIndependentResult> {
	const data: Pretender[] = [];
	const dependencies = new Set<string>();

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
		// A configuration file's `data` is already absolute (resolved by the config provider
		// from the file's own directory). What is relative here comes from a configuration with
		// no file behind it (`MLEngine`'s `config` / `defaultConfig` option), which has no
		// directory of its own, so it is read from `process.cwd()` — as its `scan` globs are.
		const cwd = process.cwd();
		data.push(
			...config.data.map(pretender => rebaseHandWrittenPretenderFilePath(pretender, p => path.resolve(cwd, p))),
		);
	}

	if (config.scan) {
		const { scan } = await import('@markuplint/pretenders');
		for (const entry of config.scan) {
			const patterns = typeof entry.files === 'string' ? [entry.files] : [...entry.files];
			// The patterns are absolute paths of the platform (`#pathResolve`), which Windows writes
			// with backslashes, and a glob reads one as an escape unless it is a slash. Only there:
			// elsewhere a backslash is the escape a pattern may mean (`\[id\]`, a directory of brackets).
			const globResults = await Promise.all(
				patterns.map(p => glob(process.platform === 'win32' ? normalizeForGlob(p) : p)),
			);
			const resolved = globResults.flat().map(f => path.resolve(f));
			if (resolved.length > 0) {
				const scanned = await scan(resolved, {
					ignoreComponentNames: entry.ignoreComponentNames ? [...entry.ignoreComponentNames] : undefined,
					dependencies,
				});
				// `scan()` (with no `cwd` option) reports filePath relative to `process.cwd()`.
				data.push(...rebasePretenderFilePaths(scanned, process.cwd()));
			}
		}
	}

	return { pretenders: data, dependencies };
}

/**
 * Step 5 of {@link resolvePretenders}: appends what `config.auto` finds in
 * `context`'s import graph to `data`, the target-independent entries.
 */
async function appendAutoPretenders(
	data: Pretender[],
	context: ResolvePretendersContext,
	auto: true | PretenderAutoOptions,
	dependencies: Set<string> | undefined,
): Promise<void> {
	const { autoScan } = await import('@markuplint/pretenders');
	const scanned = await autoScan(context.filePath, context.sourceCode, {
		depth: auto === true ? undefined : auto.depth,
		dependencies,
	});
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
 * Resolves, for the specific file about to be linted, which of the
 * file-backed `pretenders` it actually refers to — a selector shared by
 * several of them, and a name it imports from a package (a lone entry
 * included, as it may be a package's component that shares the name) — by
 * deferring to `@markuplint/pretenders`' `disambiguatePretenders`. Without a
 * file-backed entry there is nothing to resolve, which keeps that common case
 * free of the dynamic import; `disambiguatePretenders` itself skips the
 * file/AST work for a source that names none of them.
 *
 * @param filePath - Absolute path of the file being linted
 * @param sourceCode - Full source text of the file being linted
 * @param pretenders - The flat pretender list {@link resolvePretenders} produced
 * @param options - Where to report the files the result depends on
 * @returns The disambiguated pretender list, or `pretenders` itself (same
 *   reference) when there was nothing to resolve
 */
export async function disambiguatePretendersForFile(
	filePath: string,
	sourceCode: string,
	pretenders: readonly Pretender[],
	options?: ResolvePretendersOptions,
): Promise<readonly Pretender[]> {
	if (!pretenders.some(pretender => pretender.filePath)) {
		return pretenders;
	}

	const { disambiguatePretenders } = await import('@markuplint/pretenders');
	// The same base the scanned pretenders' paths were made absolute from (see `rebasePretenderFilePaths`).
	return disambiguatePretenders(pretenders, {
		filePath,
		sourceCode,
		dependencies: options?.dependencies,
		cwd: process.cwd(),
	});
}

/**
 * Whether two or more `filePath`-backed entries share a selector, whatever the
 * selector name shape.
 *
 * @deprecated Nothing in markuplint calls it any more, and it has no replacement:
 *   {@link disambiguatePretendersForFile} decides by itself whether there is anything
 *   to resolve. To be removed in the next major version.
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
