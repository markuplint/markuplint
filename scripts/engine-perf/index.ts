/**
 * Compares the speed of the TypeScript engine and the Rust engine (`--experimental-rust-core`) on
 * documents of three sizes (`generate.ts`), with `markuplint:recommended`: the lint time of a file
 * in a running process (`measure.ts`, each engine in a process of its own) and, with `--cli`, the
 * wall time of the CLI, start-up included.
 *
 * A speed is worth reporting only for the same result, so the violations of the two engines are
 * compared line for line, and a fallback of the Rust engine to the TypeScript engine is counted;
 * either makes the exit code 1.
 *
 * Run it from the repository root on Node.js 26, after `yarn build` and `yarn build:napi` (the
 * release build, in `packages/@markuplint/core`: the debug build is several times slower and
 * says nothing of the speed of the engine; in a worktree, `yarn build` with
 * `NX_WORKSPACE_ROOT_PATH=<worktree>`):
 *
 * ```sh
 * yarn perf:engines [--sizes small,medium,large] [--runs 10] [--warmup 3] [--cli]
 * ```
 *
 * The large document takes about a minute per run on the TypeScript engine, so its runs are
 * capped at 3. The numbers move with the load of the machine: compare runs made one after another.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';

import type { SizeName } from './generate.ts';
import type { Measurement } from './measure.ts';

import { CONFIG, SIZES, generate } from './generate.ts';

const LARGE_RUNS_CAP = 3;
const CLI_RUNS = 3;

const { values } = parseArgs({
	options: {
		sizes: { type: 'string', default: 'small,medium,large' },
		runs: { type: 'string', default: '10' },
		warmup: { type: 'string', default: '3' },
		cli: { type: 'boolean', default: false },
	},
});

const sizes = values.sizes.split(',').map(s => s.trim()) as SizeName[];
for (const size of sizes) {
	if (!(size in SIZES)) {
		throw new Error(`Unknown size "${size}"; one of ${Object.keys(SIZES).join(', ')}`);
	}
}

const here = path.dirname(new URL(import.meta.url).pathname);
const bin = path.resolve(here, '../../packages/markuplint/bin/markuplint.mjs');
const dir = mkdtempSync(path.join(tmpdir(), 'markuplint-engine-perf-'));
const configFile = path.join(dir, 'markuplintrc.json');
writeFileSync(configFile, JSON.stringify(CONFIG));

function measure(file: string, engine: 'ts' | 'rust', warmup: number, runs: number): Measurement {
	const child = spawnSync(
		process.execPath,
		['--experimental-strip-types', path.join(here, 'measure.ts'), file, engine, String(warmup), String(runs)],
		{ encoding: 'utf8', maxBuffer: 1 << 28 },
	);
	if (child.status !== 0) {
		throw new Error(`measure.ts (${engine}) failed:\n${child.stderr}`);
	}
	return JSON.parse(child.stdout) as Measurement;
}

/** The median wall time of the CLI per engine, the two run alternately so that load hits both alike. */
function cli(file: string) {
	const times = { ts: [] as number[], rust: [] as number[] };
	// The first round warms the disk cache and is not counted.
	for (let round = 0; round <= CLI_RUNS; round++) {
		for (const engine of ['ts', 'rust'] as const) {
			const args = [bin, file, '--config', configFile, '--format', 'JSON'];
			if (engine === 'rust') {
				args.push('--experimental-rust-core');
			}
			const start = performance.now();
			spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
			const ms = performance.now() - start;
			if (round > 0) {
				times[engine].push(ms);
			}
		}
	}
	const median = (list: number[]) => list.toSorted((a, b) => a - b)[Math.floor(list.length / 2)] ?? Number.NaN;
	return { ts: median(times.ts), rust: median(times.rust) };
}

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${n.toFixed(1)} ms`);
const rows: string[] = [];
const problems: string[] = [];

try {
	for (const size of sizes) {
		const file = path.join(dir, `${size}.html`);
		writeFileSync(file, generate(SIZES[size]));
		const kb = statSync(file).size / 1024;
		const runs = size === 'large' ? Math.min(Number(values.runs), LARGE_RUNS_CAP) : Number(values.runs);
		const warmup = size === 'large' ? Math.min(Number(values.warmup), 1) : Number(values.warmup);
		process.stderr.write(`${size} (${kb.toFixed(0)} KB): ${runs} runs per engine…\n`);

		const ts = measure(file, 'ts', warmup, runs);
		const rust = measure(file, 'rust', warmup, runs);

		if (rust.fallbacks > 0) {
			problems.push(`${size}: the Rust engine fell back to the TypeScript engine ${rust.fallbacks} times`);
		}
		const onlyTs = ts.violations.filter(v => !rust.violations.includes(v));
		const onlyRust = rust.violations.filter(v => !ts.violations.includes(v));
		if (onlyTs.length > 0 || onlyRust.length > 0) {
			problems.push(
				`${size}: the violations differ (TS only: ${onlyTs.length}, Rust only: ${onlyRust.length})`,
				...onlyTs.slice(0, 5).map(v => `  TS only:   ${v}`),
				...onlyRust.slice(0, 5).map(v => `  Rust only: ${v}`),
			);
		}

		const wall = values.cli ? cli(file) : null;
		rows.push(
			[
				`${size} (${kb.toFixed(0)} KB)`,
				String(ts.violations.length),
				ms(ts.medianMs),
				ms(rust.medianMs),
				`${(ts.medianMs / rust.medianMs).toFixed(1)}x`,
				`${ts.rssMB.toFixed(0)} / ${rust.rssMB.toFixed(0)} MB`,
				...(wall ? [ms(wall.ts), ms(wall.rust)] : []),
			].join(' | '),
		);
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}

const header = [
	'Size',
	'Violations',
	'TS (median)',
	'Rust (median)',
	'Speed-up',
	'RSS TS / Rust',
	...(values.cli ? ['CLI TS', 'CLI Rust'] : []),
];
process.stdout.write(`Node.js ${process.version}, markuplint:recommended\n\n`);
process.stdout.write(`| ${header.join(' | ')} |\n|${header.map(() => ' --- ').join('|')}|\n`);
for (const row of rows) {
	process.stdout.write(`| ${row} |\n`);
}
if (problems.length > 0) {
	process.stdout.write(`\n${problems.join('\n')}\n`);
	process.exitCode = 1;
}
