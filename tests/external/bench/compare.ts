import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { inferCategory } from './categories.ts';
import { isCliEntry } from './is-cli-entry.ts';
import { readJson, writeJson } from './fs-utils.ts';
import {
	DIFF_DIR,
	EXCLUDED_IDS_PATH,
	ML_ONLY_PATH,
	ML_SNAPSHOTS_DIR,
	NU_ONLY_PATH,
	NU_OVER_PATH,
	NU_SNAPSHOTS_DIR,
} from './paths.ts';
import type {
	Coverage,
	CoverageEntry,
	ExcludedIds,
	ExcludedPattern,
	MarkuplintSnapshot,
	NuValidatorSnapshot,
	OverDetectionEntry,
	Verdict,
} from './types.ts';

/** All inputs required to derive `CompareOutput`. */
export type CompareInputs = {
	readonly nuSnapshots: Map<string, NuValidatorSnapshot>;
	readonly mlSnapshots: Map<string, MarkuplintSnapshot>;
	readonly excludedIds: Set<string>;
	readonly excludedPatterns: readonly ExcludedPattern[];
};

/** Pure result of comparing the two snapshot trees. */
export type CompareOutput = {
	readonly coverage: Coverage;
	/** Fixtures where only markuplint flagged (mechanical, no spec ruling). */
	readonly mlOnly: readonly OverDetectionEntry[];
	/** Fixtures where only nu-validator flagged (mechanical, no spec ruling). */
	readonly nuOnly: readonly OverDetectionEntry[];
	/** Fixtures where every nu error was excluded via `excluded-ids.json`. */
	readonly nuOver: readonly OverDetectionEntry[];
	/**
	 * Files that appear in only one snapshot tree. Should be empty on a
	 * full `yarn bench:update`; non-empty when `--target` or `--filter`
	 * narrowed one leg without the other.
	 */
	readonly unpaired: {
		readonly nuSnapshotOnly: readonly string[];
		readonly mlSnapshotOnly: readonly string[];
	};
};

async function collectSnapshotPaths(root: string): Promise<string[]> {
	if (!existsSync(root)) return [];
	const out: string[] = [];
	for await (const file of glob('**/*.json', { cwd: root })) {
		if (typeof file === 'string') out.push(file);
	}
	return out.sort();
}

/**
 * Load every snapshot from `snapshots/nu-validator/` and
 * `snapshots/markuplint/`, plus the curated `excluded-ids.json`. Missing
 * directories resolve to empty maps so a first-time run reports a clear
 * "no snapshots found" error higher up.
 *
 * @returns Inputs ready to feed into `compare`.
 */
export async function loadSnapshots(): Promise<CompareInputs> {
	const [nuFiles, mlFiles] = await Promise.all([
		collectSnapshotPaths(NU_SNAPSHOTS_DIR),
		collectSnapshotPaths(ML_SNAPSHOTS_DIR),
	]);

	const nuSnapshots = new Map<string, NuValidatorSnapshot>();
	for (const file of nuFiles) {
		const snap = await readJson<NuValidatorSnapshot>(join(NU_SNAPSHOTS_DIR, file));
		nuSnapshots.set(snap.source.path, snap);
	}

	const mlSnapshots = new Map<string, MarkuplintSnapshot>();
	for (const file of mlFiles) {
		const snap = await readJson<MarkuplintSnapshot>(join(ML_SNAPSHOTS_DIR, file));
		mlSnapshots.set(snap.source.path, snap);
	}

	const excludedIds = new Set<string>();
	let excludedPatterns: readonly ExcludedPattern[] = [];
	if (existsSync(EXCLUDED_IDS_PATH)) {
		const excluded = await readJson<ExcludedIds>(EXCLUDED_IDS_PATH);
		for (const entry of excluded.entries) {
			excludedIds.add(entry.id);
		}
		excludedPatterns = excluded.patterns ?? [];
	}

	return { nuSnapshots, mlSnapshots, excludedIds, excludedPatterns };
}

function matchesPattern(message: string, patterns: readonly ExcludedPattern[]): boolean {
	for (const pattern of patterns) {
		if (message.includes(pattern.messageContains)) return true;
	}
	return false;
}

function judgeNuState(
	snap: NuValidatorSnapshot,
	excludedIds: ReadonlySet<string>,
	excludedPatterns: readonly ExcludedPattern[],
): {
	/** Post-exclusion state: the verdict uses this. */
	stateAfter: 'error' | 'clean';
	/** Pre-exclusion state: used to distinguish `match-clean` from `nu-over`. */
	stateBefore: 'error' | 'clean';
	activeIds: readonly string[];
	usedExclusions: readonly string[];
} {
	const active: string[] = [];
	const used: string[] = [];
	let hadAnyError = false;
	for (const message of snap.nuValidator.messages) {
		if (message.type !== 'error') continue;
		hadAnyError = true;
		if (excludedIds.has(message.id)) {
			used.push(message.id);
			continue;
		}
		if (matchesPattern(message.message, excludedPatterns)) {
			used.push(message.id);
			continue;
		}
		active.push(message.id);
	}
	return {
		stateAfter: active.length > 0 ? 'error' : 'clean',
		stateBefore: hadAnyError ? 'error' : 'clean',
		activeIds: active,
		usedExclusions: used,
	};
}

function judgeMlState(snap: MarkuplintSnapshot): 'error' | 'clean' {
	return snap.markuplint.violations.some(v => v.severity === 'error') ? 'error' : 'clean';
}

function deriveVerdict(
	nuAfter: 'error' | 'clean',
	nuBefore: 'error' | 'clean',
	ml: 'error' | 'clean',
): Verdict {
	if (nuAfter === 'error' && ml === 'error') return 'match-error';
	if (nuAfter === 'error' && ml === 'clean') return 'nu-only';
	if (nuAfter === 'clean' && ml === 'error') return 'ml-only';
	// nuAfter === 'clean' && ml === 'clean'
	if (nuBefore === 'error') return 'nu-over';
	return 'match-clean';
}

/**
 * Derive verdict data from pre-loaded snapshots. Pure: no filesystem or
 * network access. Verdict definitions live on the `Verdict` type.
 *
 * `excluded-ids.json` entries and patterns filter the nu error set before
 * the verdict is computed. A fixture whose nu errors are *entirely*
 * covered by exclusions collapses from the mechanical `nu-only` to
 * `nu-over` (confirmed over-detection). A partial coverage stays `nu-only`.
 *
 * @param inputs Snapshot maps keyed by fixture path plus the exclusion set.
 * @returns Coverage entries, mechanical-vs-confirmed breakdowns, and
 *   unpaired paths.
 */
export function compare(inputs: CompareInputs): CompareOutput {
	const paths = new Set<string>();
	for (const key of inputs.nuSnapshots.keys()) paths.add(key);
	for (const key of inputs.mlSnapshots.keys()) paths.add(key);
	const sortedPaths = [...paths].sort();

	const entries: CoverageEntry[] = [];
	const mlOnly: OverDetectionEntry[] = [];
	const nuOnly: OverDetectionEntry[] = [];
	const nuOver: OverDetectionEntry[] = [];
	const nuSnapshotOnly: string[] = [];
	const mlSnapshotOnly: string[] = [];

	for (const path of sortedPaths) {
		const nuSnap = inputs.nuSnapshots.get(path);
		const mlSnap = inputs.mlSnapshots.get(path);
		if (!nuSnap && mlSnap) {
			mlSnapshotOnly.push(path);
			continue;
		}
		if (nuSnap && !mlSnap) {
			nuSnapshotOnly.push(path);
			continue;
		}
		if (!nuSnap || !mlSnap) continue;

		const nu = judgeNuState(nuSnap, inputs.excludedIds, inputs.excludedPatterns);
		const ml = judgeMlState(mlSnap);
		const verdict = deriveVerdict(nu.stateAfter, nu.stateBefore, ml);
		const category = inferCategory(path);

		entries.push({
			path,
			category,
			nu: nu.stateAfter,
			ml,
			verdict,
			excludedIds: nu.usedExclusions,
		});

		if (verdict === 'ml-only') {
			const ruleIds = [...new Set(mlSnap.markuplint.violations.filter(v => v.severity === 'error').map(v => v.ruleId))].sort();
			mlOnly.push({ path, category, ruleIds });
		} else if (verdict === 'nu-only') {
			nuOnly.push({ path, category, nuMessageIds: nu.activeIds });
		} else if (verdict === 'nu-over') {
			nuOver.push({ path, category, nuMessageIds: nu.usedExclusions });
		}
	}

	return {
		coverage: { entries },
		mlOnly,
		nuOnly,
		nuOver,
		unpaired: { nuSnapshotOnly, mlSnapshotOnly },
	};
}

/**
 * Persist the four diff JSONs under `snapshots/diff/`. Does not touch
 * `summary.md` — that is written separately by `report.ts` so maintainers
 * can regenerate just the human-readable view without re-walking snapshots.
 *
 * - `coverage.json` — per-file verdict.
 * - `markuplint-only.json` — fixtures only markuplint flagged (mechanical).
 * - `nu-only.json` — fixtures only nu-validator flagged (no spec ruling yet).
 * - `nu-over.json` — fixtures whose nu errors are all spec-excluded.
 *
 * @param output The result of `compare`.
 */
export async function writeCompareOutputs(output: CompareOutput): Promise<void> {
	await writeJson(join(DIFF_DIR, 'coverage.json'), output.coverage);
	await writeJson(ML_ONLY_PATH, { entries: output.mlOnly });
	await writeJson(NU_ONLY_PATH, { entries: output.nuOnly });
	await writeJson(NU_OVER_PATH, { entries: output.nuOver });
}

/**
 * High-level entry: load snapshots, run `compare`, write the diff JSONs,
 * and log a one-line summary plus unpaired-file warning (if any). Called
 * both from the CLI entry and from `update-snapshots` orchestration.
 *
 * @returns The `CompareOutput` that was written, for further inspection.
 * @throws If neither snapshot tree has entries to compare.
 */
export async function runCompare(): Promise<CompareOutput> {
	const inputs = await loadSnapshots();
	if (inputs.nuSnapshots.size === 0 || inputs.mlSnapshots.size === 0) {
		throw new Error('no snapshots found; run yarn bench:update first');
	}
	const output = compare(inputs);
	await writeCompareOutputs(output);
	const summary = output.coverage.entries.reduce<Record<Verdict, number>>(
		(acc, entry) => ({ ...acc, [entry.verdict]: (acc[entry.verdict] ?? 0) + 1 }),
		{ 'match-error': 0, 'match-clean': 0, 'ml-only': 0, 'nu-only': 0, 'nu-over': 0 },
	);
	console.log(
		`[compare] entries=${output.coverage.entries.length} match-error=${summary['match-error']} match-clean=${summary['match-clean']} ml-only=${summary['ml-only']} nu-only=${summary['nu-only']} nu-over=${summary['nu-over']}`,
	);
	const unpairedCount = output.unpaired.nuSnapshotOnly.length + output.unpaired.mlSnapshotOnly.length;
	if (unpairedCount > 0) {
		console.warn(
			`[compare] unpaired snapshots: ${unpairedCount} files present in only one tree (nu-only=${output.unpaired.nuSnapshotOnly.length} ml-only=${output.unpaired.mlSnapshotOnly.length}). ` +
				'Run yarn bench:update with the same filter on both targets to realign.',
		);
		for (const path of output.unpaired.nuSnapshotOnly.slice(0, 5)) console.warn(`[compare]   only in nu snapshot: ${path}`);
		for (const path of output.unpaired.mlSnapshotOnly.slice(0, 5)) console.warn(`[compare]   only in ml snapshot: ${path}`);
	}
	console.log(`[compare] wrote ${relative(process.cwd(), DIFF_DIR)}/{coverage,markuplint-only,nu-only,nu-over}.json`);
	return output;
}

if (isCliEntry(import.meta.url)) {
	runCompare().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
