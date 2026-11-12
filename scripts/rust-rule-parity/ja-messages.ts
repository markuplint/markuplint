/**
 * The work list for converting the Rust rules to `t()`: the rules whose Japanese messages differ
 * from the TypeScript rules'.
 *
 * A Rust rule that builds an English string directly (`format!`) passes the English parity run
 * (`yarn test:rust-rules`) and still prints English under `locale: 'ja'`. This script finds those:
 * for the input and config of every call of `mlRuleTest` in the rule specs of `@markuplint/rules`,
 * it lints with the TypeScript engine and with the Rust engine, both in `ja`, and compares the
 * messages. The spec's own expectations (English) are not asserted: the specs run against the
 * TypeScript engine as they do in `yarn test`, only to reach every input.
 *
 * Run it from the repository root, after `yarn build` and `yarn build:napi:debug` (in
 * `packages/@markuplint/core`; in a worktree, with `NX_WORKSPACE_ROOT_PATH=<worktree>`):
 *
 * ```sh
 * node --experimental-strip-types scripts/rust-rule-parity/ja-messages.ts [--out <report.txt>] [--rule <name>]
 * ```
 *
 * `--out` writes the report to a file as well as to the standard output; `--rule` limits the run to
 * the specs of the rules that contain the text. The report has, per rule, the number of differing
 * tests and one example pair. Calls where the two engines return a different number of violations
 * are listed apart (an English parity gap, not a translation gap), and so are calls the Rust engine
 * could not lint. The exit code is 1 while any rule differs, so a converted rule can be checked
 * by running with `--rule`.
 *
 * `ja-setup.ts` does the comparing; `vitest.rust-rule-ja-parity.config.ts` is its configuration.
 */

import type { JaParityRecord } from './ja-setup.ts';

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
	options: { out: { type: 'string' }, rule: { type: 'string' } },
});

const dir = mkdtempSync(path.join(tmpdir(), 'ml-ja-parity-'));
const recordFile = path.join(dir, 'records.jsonl');
writeFileSync(recordFile, '');

const filters = values.rule ? [`packages/@markuplint/rules/src/${values.rule}`] : [];
const run = spawnSync('yarn', ['vitest', 'run', '--config', 'vitest.rust-rule-ja-parity.config.ts', ...filters], {
	env: { ...process.env, ML_JA_PARITY_OUT: recordFile },
	stdio: ['ignore', 'ignore', 'inherit'],
});

const records = readFileSync(recordFile, 'utf8')
	.split('\n')
	.filter(Boolean)
	.map(line => JSON.parse(line) as JaParityRecord);
rmSync(dir, { recursive: true, force: true });

const byRule = <R extends JaParityRecord>(kind: R['kind']) => {
	const map = new Map<string, R[]>();
	for (const record of records) {
		if (record.kind === kind) {
			const list = map.get(record.rule) ?? [];
			list.push(record as R);
			map.set(record.rule, list);
		}
	}
	return new Map([...map].toSorted(([a], [b]) => a.localeCompare(b)));
};

const tests = (list: readonly JaParityRecord[]) => new Set(list.map(r => r.test)).size;

const lines: string[] = [];
const diffs = byRule<Extract<JaParityRecord, { kind: 'diff' }>>('diff');
lines.push(
	`Rules whose ja messages differ from the TS rule: ${diffs.size}`,
	'(rule: number of differing tests; one example, as `test` / input / TS / Rust)',
	'',
);
for (const [rule, list] of diffs) {
	const example = list[0]!;
	lines.push(
		`${rule}: ${tests(list)}`,
		`  test:  ${example.test}`,
		`  input: ${JSON.stringify(example.source)}`,
		`  TS:    ${example.ts}`,
		`  Rust:  ${example.rust}`,
		'',
	);
}

const counts = byRule<Extract<JaParityRecord, { kind: 'count' }>>('count');
if (counts.size > 0) {
	lines.push(
		`Calls where the engines return a different number of violations (English parity gap): ${counts.size} rules`,
	);
	for (const [rule, list] of counts) {
		const example = list[0]!;
		lines.push(`  ${rule}: ${tests(list)} tests, e.g. ${example.test} (TS ${example.ts}, Rust ${example.rust})`);
	}
	lines.push('');
}

const errors = byRule<Extract<JaParityRecord, { kind: 'rust-error' }>>('rust-error');
if (errors.size > 0) {
	lines.push(`Calls the Rust engine could not lint (fell back or failed): ${errors.size} rules`);
	for (const [rule, list] of errors) {
		const example = list[0]!;
		lines.push(`  ${rule}: ${tests(list)} tests, e.g. ${example.test}: ${example.error.slice(0, 160)}`);
	}
	lines.push('');
}

const report = lines.join('\n');
process.stdout.write(report + '\n');
if (values.out) {
	writeFileSync(values.out, report + '\n');
}
process.exitCode = run.status === null || diffs.size > 0 ? 1 : 0;
