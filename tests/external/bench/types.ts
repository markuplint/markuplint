/**
 * nu-validator's test fixtures encode the expected outcome in the filename
 * (`foo-novalid.html`, `foo-isvalid.html`, etc.). We preserve the hint on the
 * snapshot for cross-reference but never use it to judge the verdict — the
 * verdict comes from the actual nu-validator + markuplint outputs.
 */
export type FilenameHint = 'novalid' | 'isvalid' | 'haswarn' | 'hasinfo' | 'other';

/** Message categories emitted by the nu-validator HTTP API. */
export type NuMessageType = 'error' | 'warning' | 'info' | 'non-document-error';

/**
 * One message as stored in `snapshots/nu-validator/<path>.json`. Shape mirrors
 * the nu-validator JSON API output, extended with a stable `id` so
 * `excluded-ids.json` entries survive rerunning the benchmark.
 */
export type NuMessage = {
	readonly id: string;
	readonly type: NuMessageType;
	readonly subType: string | null;
	readonly message: string;
	readonly firstLine: number | null;
	readonly lastLine: number | null;
	readonly firstColumn: number | null;
	readonly lastColumn: number | null;
	readonly extract: string | null;
	readonly hiliteStart: number | null;
	readonly hiliteLength: number | null;
};

/**
 * A single `snapshots/nu-validator/<path>.json` file. Written by
 * `run-nu-validator.ts`; gitignored because it is reproducible from the
 * submodule SHA and the nu-validator image digest recorded in `meta.json`.
 */
export type NuValidatorSnapshot = {
	readonly source: {
		readonly path: string;
		readonly sha256: string;
		readonly filenameHint: FilenameHint;
	};
	readonly nuValidator: {
		readonly imageDigest: string;
		readonly messages: readonly NuMessage[];
		readonly error?: string;
	};
};

/**
 * A markuplint violation as serialised into
 * `snapshots/markuplint/<path>.json`. The shape is a hand-picked subset of
 * `@markuplint/ml-config`'s `Violation` type: only the fields that the
 * benchmark compares against.
 */
export type MlViolation = {
	readonly ruleId: string;
	readonly severity: 'error' | 'warning' | 'info';
	readonly message: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

/**
 * A single `snapshots/markuplint/<path>.json` file. Written by
 * `run-markuplint.ts`; gitignored because it is reproducible from the
 * markuplint version recorded in `meta.json`.
 *
 * `parseError` is `true` iff `mlTest()` threw a recoverable (non-Tier-1)
 * error for this fixture; `parseErrorMessage` captures its first line so the
 * failure can be diagnosed without rerunning.
 */
export type MarkuplintSnapshot = {
	readonly source: {
		readonly path: string;
		readonly sha256: string;
	};
	readonly markuplint: {
		readonly version: string;
		readonly configId: string;
		readonly violations: readonly MlViolation[];
		readonly parseError: boolean;
		readonly parseErrorMessage: string | null;
	};
};

/**
 * One declared discrepancy between nu-validator and markuplint. Maintainers
 * add an entry when nu-validator flags an error that markuplint correctly
 * does not flag, so the verdict collapses from `nu-over` to `match-clean`.
 * Every field is required so `reason`, `addedAt`, and `addedBy` leave an
 * audit trail.
 */
export type ExcludedIdEntry = {
	readonly id: string;
	readonly path: string;
	readonly nuMessage: string;
	readonly reason: string;
	readonly addedAt: string;
	readonly addedBy: string;
};

/**
 * A substring-based exclusion. Useful when nu-validator emits the same
 * diagnostic text on many fixtures (e.g. URL-parsing validation errors with
 * different URL values). Every nu-validator message whose text contains
 * `messageContains` is treated as excluded. `specUrl` is required so the
 * audit trail always points back to the authoritative standard.
 */
export type ExcludedPattern = {
	readonly messageContains: string;
	readonly reason: string;
	readonly specUrl: string;
	readonly addedAt: string;
	readonly addedBy: string;
};

/** Root shape of `snapshots/excluded-ids.json`. */
export type ExcludedIds = {
	readonly $schema?: string;
	readonly entries: readonly ExcludedIdEntry[];
	readonly patterns?: readonly ExcludedPattern[];
};

/**
 * Per-file judgment produced by `compare()`.
 *
 * The four "mechanical" verdicts are purely observational — they record
 * what each tool emitted, not who is right. Spec-backed judgement lives in
 * `excluded-ids.json`; an entry there promotes `nu-only` to `nu-over`.
 *
 * - `match-error`   — both tools reported an error.
 * - `match-clean`   — both tools cleared the file with nothing excluded.
 * - `ml-only`       — markuplint reported an error, nu-validator did not.
 *                     Without a spec audit this is unclassified; it could
 *                     be a markuplint false positive or a nu-validator gap.
 * - `nu-only`       — nu-validator reported an error, markuplint did not,
 *                     and no spec-backed exclusion covers it. Candidate
 *                     for markuplint coverage work.
 * - `nu-over`       — nu-validator reported an error, every such error is
 *                     covered by a spec-backed entry in `excluded-ids.json`,
 *                     and markuplint is clean. Confirmed nu-validator
 *                     over-detection; no markuplint change needed.
 */
export type Verdict = 'match-error' | 'match-clean' | 'ml-only' | 'nu-only' | 'nu-over';

/** One entry of `snapshots/diff/coverage.json`. */
export type CoverageEntry = {
	readonly path: string;
	readonly category: string;
	readonly nu: 'error' | 'clean';
	readonly ml: 'error' | 'clean';
	readonly verdict: Verdict;
	readonly excludedIds: readonly string[];
};

/** Root shape of `snapshots/diff/coverage.json`. */
export type Coverage = {
	readonly entries: readonly CoverageEntry[];
};

/**
 * One entry of `markuplint-only.json`, `nu-only.json`, or `nu-over.json`.
 * `ruleIds` populates the markuplint-side breakdown; `nuMessageIds`
 * populates the nu-validator-side breakdown (so a reviewer can jump to
 * the specific nu-validator messages either to audit for exclusion or to
 * drive markuplint coverage work).
 */
export type OverDetectionEntry = {
	readonly path: string;
	readonly category: string;
	readonly ruleIds?: readonly string[];
	readonly nuMessageIds?: readonly string[];
};

/**
 * Root shape of `snapshots/meta.json`. Records the versions of everything that
 * can change a snapshot's contents so reviewers can explain unexpected diffs.
 * Totals are split per target (`totalFilesNu` / `totalFilesMl`) so partial
 * reruns (`--target`) do not clobber the other leg.
 */
export type Meta = {
	readonly generatedAt: string;
	readonly submoduleSha: string;
	readonly nuValidatorImage: string;
	readonly markuplintVersion: string;
	readonly nodeVersion: string;
	readonly totalFilesNu: number;
	readonly totalFilesMl: number;
	readonly totalNuMessages: number;
	readonly totalMlViolations: number;
	readonly totalNuFailures: number;
};
