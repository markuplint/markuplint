/**
 * One engine on one file, in a process of its own so that the two engines do not share a warmed-up
 * JIT or a heap: `node --experimental-strip-types measure.ts <file> <ts|rust> <warmup> <runs>`.
 *
 * Each run builds a fresh `MLEngine` and calls `exec()`, as the CLI does for a file, so the time
 * includes resolving the config and parsing; the first run, which also loads the rules and the
 * spec, is reported apart. Prints one JSON line ({@link Measurement}).
 */

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { MLEngine } from 'markuplint';

import { CONFIG } from './generate.ts';

export type Measurement = {
	readonly engine: 'ts' | 'rust';
	readonly firstMs: number;
	readonly medianMs: number;
	readonly minMs: number;
	readonly maxMs: number;
	readonly rssMB: number;
	/** The times the Rust engine fell back to the TypeScript engine; the result is then not its own. */
	readonly fallbacks: number;
	/** The violations of the last run, one line each, sorted. */
	readonly violations: readonly string[];
};

const [file, engineArg, warmupArg, runsArg] = process.argv.slice(2);
if (!file || (engineArg !== 'ts' && engineArg !== 'rust')) {
	throw new Error('usage: measure.ts <file> <ts|rust> <warmup> <runs>');
}
const engineName = engineArg;
const sourceCode = readFileSync(file, 'utf8');
let fallbacks = 0;

async function once() {
	const mlFile = await MLEngine.toMLFile({ sourceCode, name: file });
	if (!mlFile) {
		throw new Error(`Cannot read ${file}`);
	}
	const engine = new MLEngine(mlFile, {
		config: CONFIG,
		noSearchConfig: true,
		experimentalRustCore: engineName === 'rust',
	});
	engine.on('log', phase => {
		if (phase === 'experimental-rust-core:fallback') {
			fallbacks++;
		}
	});
	const start = performance.now();
	const result = await engine.exec();
	const ms = performance.now() - start;
	await engine.close();
	const violations = (result?.violations ?? [])
		.map(v => `${v.line}:${v.col} ${v.severity} ${v.ruleId} ${v.message} | ${v.raw}`)
		.toSorted();
	return { ms, violations };
}

const first = await once();
for (let i = 0; i < Number(warmupArg); i++) {
	await once();
}
const times: number[] = [];
let { violations } = first;
for (let i = 0; i < Number(runsArg); i++) {
	const run = await once();
	times.push(run.ms);
	violations = run.violations;
}
times.sort((a, b) => a - b);

const measurement: Measurement = {
	engine: engineName,
	firstMs: first.ms,
	medianMs: times[Math.floor(times.length / 2)] ?? first.ms,
	minMs: times[0] ?? first.ms,
	maxMs: times.at(-1) ?? first.ms,
	rssMB: process.memoryUsage().rss / 1_048_576,
	fallbacks,
	violations,
};
process.stdout.write(`${JSON.stringify(measurement)}\n`);
