import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { inferCategory } from './categories.ts';
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

export type CompareInputs = {
	readonly nuSnapshots: Map<string, NuValidatorSnapshot>;
	readonly mlSnapshots: Map<string, MarkuplintSnapshot>;
	readonly excludedIds: Set<string>;
};

export type CompareOutput = {
	readonly coverage: Coverage;
	readonly mlOverDetection: readonly OverDetectionEntry[];
	readonly nuOverDetection: readonly OverDetectionEntry[];
};

async function collectSnapshotPaths(root: string): Promise<string[]> {
	if (!existsSync(root)) return [];
	const out: string[] = [];
	for await (const file of glob('**/*.json', { cwd: root })) {
		if (typeof file === 'string') out.push(file);
	}
	return out.sort();
}

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

export function compare(inputs: CompareInputs): CompareOutput {
	const paths = new Set<string>();
	for (const key of inputs.nuSnapshots.keys()) paths.add(key);
	for (const key of inputs.mlSnapshots.keys()) paths.add(key);
	const sortedPaths = [...paths].sort();

	const entries: CoverageEntry[] = [];
	const mlOver: OverDetectionEntry[] = [];
	const nuOver: OverDetectionEntry[] = [];

	for (const path of sortedPaths) {
		const nuSnap = inputs.nuSnapshots.get(path);
		const mlSnap = inputs.mlSnapshots.get(path);
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
	};
}

export async function writeCompareOutputs(output: CompareOutput): Promise<void> {
	await writeJson(join(DIFF_DIR, 'coverage.json'), output.coverage);
	await writeJson(join(DIFF_DIR, 'markuplint-over-detection.json'), { entries: output.mlOverDetection });
	await writeJson(join(DIFF_DIR, 'nu-over-detection.json'), { entries: output.nuOverDetection });
}

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
	console.log(`[compare] wrote ${relative(process.cwd(), DIFF_DIR)}/{coverage,markuplint-over-detection,nu-over-detection}.json`);
	return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	runCompare().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
