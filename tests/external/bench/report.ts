import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readJson } from './fs-utils.ts';
import { isCliEntry } from './is-cli-entry.ts';
import { DIFF_DIR, META_PATH, SNAPSHOTS_DIR } from './paths.ts';
import type { Coverage, CoverageEntry, ExcludedIds, Meta, OverDetectionEntry, Verdict } from './types.ts';

type Entries<T> = { readonly entries: readonly T[] };

function count<K extends string>(keys: readonly K[]): Record<K, number> {
	const out = {} as Record<K, number>;
	for (const key of keys) {
		out[key] = (out[key] ?? 0) + 1;
	}
	return out;
}

function groupByCategory(entries: readonly CoverageEntry[]): Map<string, CoverageEntry[]> {
	const map = new Map<string, CoverageEntry[]>();
	for (const entry of entries) {
		const list = map.get(entry.category) ?? [];
		list.push(entry);
		map.set(entry.category, list);
	}
	return map;
}

function percent(numerator: number, denominator: number): string {
	if (denominator === 0) return '—';
	return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function topN(items: Iterable<string>, n: number): [string, number][] {
	const counts = count([...items]);
	return Object.entries(counts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, n);
}

/**
 * Regenerate `snapshots/diff/summary.md` from the existing diff JSONs and
 * `meta.json`. Pure over the filesystem: reads the current diff + meta set,
 * writes only `summary.md`.
 *
 * @throws If `coverage.json` is missing. Run `yarn bench:update` (or at
 *   least `yarn bench:compare`) first.
 */
export async function runReport(): Promise<void> {
	if (!existsSync(join(DIFF_DIR, 'coverage.json'))) {
		throw new Error('coverage.json not found; run yarn bench:update && yarn bench:compare first');
	}

	const [coverage, mlOverData, nuOverData, meta] = await Promise.all([
		readJson<Coverage>(join(DIFF_DIR, 'coverage.json')),
		readJson<Entries<OverDetectionEntry>>(join(DIFF_DIR, 'markuplint-over-detection.json')),
		readJson<Entries<OverDetectionEntry>>(join(DIFF_DIR, 'nu-over-detection.json')),
		existsSync(META_PATH) ? readJson<Meta>(META_PATH) : Promise.resolve(null),
	]);

	const excludedIds = existsSync(join(SNAPSHOTS_DIR, 'excluded-ids.json'))
		? await readJson<ExcludedIds>(join(SNAPSHOTS_DIR, 'excluded-ids.json'))
		: { entries: [] };

	const total = coverage.entries.length;
	const verdictCounts = count(coverage.entries.map(e => e.verdict as Verdict));

	const byCategory = groupByCategory(coverage.entries);
	const categoryRows = [...byCategory.entries()]
		.map(([category, list]) => {
			const c = count(list.map(e => e.verdict as Verdict));
			const match = (c['match-error'] ?? 0) + (c['match-clean'] ?? 0);
			return {
				category,
				total: list.length,
				matchRate: percent(match, list.length),
				matchError: c['match-error'] ?? 0,
				matchClean: c['match-clean'] ?? 0,
				mlOver: c['ml-over'] ?? 0,
				nuOver: c['nu-over'] ?? 0,
			};
		})
		.sort((a, b) => a.category.localeCompare(b.category));

	const mlOverRules = topN(
		mlOverData.entries.flatMap(e => e.ruleIds ?? []),
		10,
	);

	const lines: string[] = [];
	lines.push('# nu-validator Benchmark Summary', '');
	if (meta) {
		lines.push(`- generated: ${meta.generatedAt}`);
		lines.push(`- submodule: \`${meta.submoduleSha}\``);
		lines.push(`- nu-validator: \`${meta.nuValidatorImage}\``);
		lines.push(`- markuplint: \`${meta.markuplintVersion}\``);
		lines.push(`- node: \`${meta.nodeVersion}\``);
		lines.push('');
	}
	lines.push('## Totals', '');
	lines.push(`- files: **${total}**`);
	lines.push(`- match-error: **${verdictCounts['match-error'] ?? 0}**`);
	lines.push(`- match-clean: **${verdictCounts['match-clean'] ?? 0}**`);
	lines.push(`- ml-over (markuplint over-detection): **${verdictCounts['ml-over'] ?? 0}**`);
	lines.push(`- nu-over (nu-validator over-detection): **${verdictCounts['nu-over'] ?? 0}**`);
	const matchCount = (verdictCounts['match-error'] ?? 0) + (verdictCounts['match-clean'] ?? 0);
	lines.push(`- overall match rate: **${percent(matchCount, total)}**`);
	const patternCount = excludedIds.patterns?.length ?? 0;
	lines.push(`- excluded-ids: ${excludedIds.entries.length} entries, ${patternCount} pattern(s)`);
	lines.push('');

	lines.push('## Per-Category', '');
	lines.push('| Category | Files | Match rate | match-error | match-clean | ml-over | nu-over |');
	lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
	for (const row of categoryRows) {
		lines.push(
			`| ${row.category} | ${row.total} | ${row.matchRate} | ${row.matchError} | ${row.matchClean} | ${row.mlOver} | ${row.nuOver} |`,
		);
	}
	lines.push('');

	if (mlOverRules.length > 0) {
		lines.push('## Top markuplint over-detection rules', '');
		lines.push('| Rule | Count |');
		lines.push('| --- | ---: |');
		for (const [rule, n] of mlOverRules) {
			lines.push(`| ${rule} | ${n} |`);
		}
		lines.push('');
	}

	lines.push(
		'> nu-over entries are candidates for excluded-ids.json when markuplint is correctly not flagging them.',
	);
	lines.push('');

	const outPath = join(DIFF_DIR, 'summary.md');
	await writeFile(outPath, `${lines.join('\n')}\n`, 'utf8');
	console.log('[report] wrote', outPath);
}

if (isCliEntry(import.meta.url)) {
	runReport().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
