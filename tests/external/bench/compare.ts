import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { inferCategory } from './categories.ts';
import { isCliEntry } from './is-cli-entry.ts';
import { readJson, writeJson } from './fs-utils.ts';
import { DIFF_DIR, EXCLUDED_IDS_PATH, ML_SNAPSHOTS_DIR, NU_SNAPSHOTS_DIR } from './paths.ts';
import type {
	Coverage,
	CoverageEntry,
	ExcludedIds,
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
};

/** Pure result of comparing the two snapshot trees. */
export type CompareOutput = {
	readonly coverage: Coverage;
	readonly mlOverDetection: readonly OverDetectionEntry[];
	readonly nuOverDetection: readonly OverDetectionEntry[];
	/**
	 * Files that appear in only one snapshot tree. Should be empty on a
	 * full `yarn bench:update`; non-empty when `--target` or `--filter`
	 * narrowed one leg without the other.
	 */
	readonly unpaired: {
		readonly nuOnly: readonly string[];
		readonly mlOnly: readonly string[];
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
	if (existsSync(EXCLUDED_IDS_PATH)) {
		const excluded = await readJson<ExcludedIds>(EXCLUDED_IDS_PATH);
		for (const entry of excluded.entries) {
			excludedIds.add(entry.id);
		}
	}

	return { nuSnapshots, mlSnapshots, excludedIds };
}

function judgeNuState(snap: NuValidatorSnapshot, excludedIds: ReadonlySet<string>): {
	state: 'error' | 'clean';
	activeIds: readonly string[];
	usedExclusions: readonly string[];
} {
	const active: string[] = [];
	const used: string[] = [];
	for (const message of snap.nuValidator.messages) {
		if (message.type !== 'error') continue;
		if (excludedIds.has(message.id)) {
			used.push(message.id);
			continue;
		}
		active.push(message.id);
	}
	return {
		state: active.length > 0 ? 'error' : 'clean',
		activeIds: active,
		usedExclusions: used,
	};
}

function judgeMlState(snap: MarkuplintSnapshot): 'error' | 'clean' {
	return snap.markuplint.violations.some(v => v.severity === 'error') ? 'error' : 'clean';
}

function deriveVerdict(nu: 'error' | 'clean', ml: 'error' | 'clean'): Verdict {
	if (nu === 'error' && ml === 'error') return 'match-error';
	if (nu === 'clean' && ml === 'clean') return 'match-clean';
	if (nu === 'clean' && ml === 'error') return 'ml-over';
	return 'nu-over';
}

/**
 * Derive verdict data from pre-loaded snapshots. Pure: no filesystem or
 * network access. Verdict definitions live on the `Verdict` type.
 *
 * Excluded IDs are filtered out of the nu-validator error set before the
 * verdict is computed, so adding an entry to `excluded-ids.json`
 * automatically collapses that file from `nu-over` to `match-clean`.
 *
 * @param inputs Snapshot maps keyed by fixture path plus the exclusion set.
 * @returns Coverage entries, over-detection breakdowns, and unpaired paths.
 */
export function compare(inputs: CompareInputs): CompareOutput {
	const paths = new Set<string>();
	for (const key of inputs.nuSnapshots.keys()) paths.add(key);
	for (const key of inputs.mlSnapshots.keys()) paths.add(key);
	const sortedPaths = [...paths].sort();

	const entries: CoverageEntry[] = [];
	const mlOver: OverDetectionEntry[] = [];
	const nuOver: OverDetectionEntry[] = [];
	const nuOnly: string[] = [];
	const mlOnly: string[] = [];

	for (const path of sortedPaths) {
		const nuSnap = inputs.nuSnapshots.get(path);
		const mlSnap = inputs.mlSnapshots.get(path);
		if (!nuSnap && mlSnap) {
			mlOnly.push(path);
			continue;
		}
		if (nuSnap && !mlSnap) {
			nuOnly.push(path);
			continue;
		}
		if (!nuSnap || !mlSnap) continue;

		const nu = judgeNuState(nuSnap, inputs.excludedIds);
		const ml = judgeMlState(mlSnap);
		const verdict = deriveVerdict(nu.state, ml);
		const category = inferCategory(path);

		entries.push({
			path,
			category,
			nu: nu.state,
			ml,
			verdict,
			excludedIds: nu.usedExclusions,
		});

		if (verdict === 'ml-over') {
			const ruleIds = [...new Set(mlSnap.markuplint.violations.filter(v => v.severity === 'error').map(v => v.ruleId))].sort();
			mlOver.push({ path, category, ruleIds });
		} else if (verdict === 'nu-over') {
			nuOver.push({ path, category, nuMessageIds: nu.activeIds });
		}
	}

	return {
		coverage: { entries },
		mlOverDetection: mlOver,
		nuOverDetection: nuOver,
		unpaired: { nuOnly, mlOnly },
	};
}

/**
 * Persist the three diff JSONs under `snapshots/diff/`. Does not touch
 * `summary.md` — that is written separately by `report.ts` so maintainers
 * can regenerate just the human-readable view without re-walking snapshots.
 *
 * @param output The result of `compare`.
 */
export async function writeCompareOutputs(output: CompareOutput): Promise<void> {
	await writeJson(join(DIFF_DIR, 'coverage.json'), output.coverage);
	await writeJson(join(DIFF_DIR, 'markuplint-over-detection.json'), { entries: output.mlOverDetection });
	await writeJson(join(DIFF_DIR, 'nu-over-detection.json'), { entries: output.nuOverDetection });
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
		{ 'match-error': 0, 'match-clean': 0, 'ml-over': 0, 'nu-over': 0 },
	);
	console.log(
		`[compare] entries=${output.coverage.entries.length} match-error=${summary['match-error']} match-clean=${summary['match-clean']} ml-over=${summary['ml-over']} nu-over=${summary['nu-over']}`,
	);
	const unpairedCount = output.unpaired.nuOnly.length + output.unpaired.mlOnly.length;
	if (unpairedCount > 0) {
		console.warn(
			`[compare] unpaired: ${unpairedCount} files present in only one snapshot tree (nu-only=${output.unpaired.nuOnly.length} ml-only=${output.unpaired.mlOnly.length}). ` +
				'Run yarn bench:update with the same filter on both targets to realign.',
		);
		for (const path of output.unpaired.nuOnly.slice(0, 5)) console.warn(`[compare]   nu-only: ${path}`);
		for (const path of output.unpaired.mlOnly.slice(0, 5)) console.warn(`[compare]   ml-only: ${path}`);
	}
	console.log(`[compare] wrote ${relative(process.cwd(), DIFF_DIR)}/{coverage,markuplint-over-detection,nu-over-detection}.json`);
	return output;
}

if (isCliEntry(import.meta.url)) {
	runCompare().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
