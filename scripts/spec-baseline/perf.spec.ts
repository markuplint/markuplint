import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { scenarios } from './perf-child.ts';
import {
	collect,
	compareResults,
	interleave,
	isRustScenario,
	parseChildOutput,
	pickValidatorFiles,
	renderComparison,
	renderTable,
	runPerf,
	rustBinary,
	rustCommand,
	RUST_SCENARIOS,
	writeQuestionsFile,
} from './perf.ts';

describe('interleave', () => {
	test('lists every run of every scenario exactly once', () => {
		const order = interleave({ a: 3, b: 2 }, 1);
		expect(order.toSorted()).toStrictEqual(['a', 'a', 'a', 'b', 'b']);
	});

	test('gives the same order for the same seed and, for some other seed, another', () => {
		const counts = { a: 10, b: 10, c: 10 };
		expect(interleave(counts, 1)).toStrictEqual(interleave(counts, 1));
		const orders = new Set([2, 3, 4, 5].map(seed => interleave(counts, seed).join('')));
		expect(orders.size).toBeGreaterThan(1);
	});
});

describe('parseChildOutput', () => {
	test('reads the measurements from the last line that is JSON, ignoring what the code under test printed before', () => {
		const out = 'noise\n{"measurements":[{"name":"x","unit":"ms","values":[1,2]}]}\n';
		expect(parseChildOutput(out)).toStrictEqual([{ name: 'x', unit: 'ms', values: [1, 2] }]);
	});

	test('throws for an output with no measurements', () => {
		expect(() => parseChildOutput('nothing here')).toThrow(/measurements/);
	});
});

describe('collect', () => {
	test('gathers the values of a name from each process, in the order the processes ran', () => {
		const result = collect([
			[{ name: 'x', unit: 'ms', values: [5, 1, 1] }],
			[{ name: 'x', unit: 'ms', values: [7, 2, 2] }],
		]);
		expect(result.x).toStrictEqual({
			unit: 'ms',
			processes: [
				[5, 1, 1],
				[7, 2, 2],
			],
		});
	});

	test('rejects a name that has two units', () => {
		expect(() =>
			collect([[{ name: 'x', unit: 'ms', values: [1] }], [{ name: 'x', unit: 'bytes', values: [1] }]]),
		).toThrow(/unit/);
	});
});

describe('renderTable', () => {
	test('shows the first iteration and the rest apart, each with its interval', () => {
		const text = renderTable(
			collect([[{ name: 'x', unit: 'ms', values: [10, 1, 1] }], [{ name: 'x', unit: 'ms', values: [12, 1, 1] }]]),
			{ resamples: 100, seed: 1 },
		);
		expect(text).toContain('x');
		expect(text).toContain('first');
		expect(text).toContain('rest');
		expect(text).toContain('11.000');
	});

	test('shows a measurement that has one value only as a single figure', () => {
		const text = renderTable(
			collect([
				[{ name: 'size', unit: 'bytes', values: [100] }],
				[{ name: 'size', unit: 'bytes', values: [100] }],
			]),
			{ resamples: 100, seed: 1 },
		);
		expect(text).toContain('size');
		expect(text).not.toContain('rest');
	});
});

describe('compareResults', () => {
	const slow = collect([
		[{ name: 'x', unit: 'ms', values: [20, 20, 20] }],
		[{ name: 'x', unit: 'ms', values: [21, 20, 20] }],
		[{ name: 'x', unit: 'ms', values: [20, 21, 20] }],
	]);
	const fast = collect([
		[{ name: 'x', unit: 'ms', values: [10, 10, 10] }],
		[{ name: 'x', unit: 'ms', values: [10, 11, 10] }],
		[{ name: 'x', unit: 'ms', values: [11, 10, 10] }],
	]);

	test('gives the ratio of the second to the first for the names both have, with an interval', () => {
		const rows = compareResults(slow, fast, { resamples: 500, seed: 1 });
		expect(rows).toHaveLength(2);
		const rest = rows.find(row => row.part === 'rest');
		expect(rest?.ratio).toBeCloseTo(0.5, 1);
		expect(rest?.high).toBeLessThan(1);
	});

	test('skips a name that only one side has', () => {
		const other = collect([[{ name: 'y', unit: 'ms', values: [1] }]]);
		expect(compareResults(slow, other, { resamples: 10, seed: 1 })).toStrictEqual([]);
	});

	test('is shown with the words for the direction', () => {
		const text = renderComparison(compareResults(slow, fast, { resamples: 500, seed: 1 }));
		expect(text).toContain('x');
		expect(text).toMatch(/0\.5/);
	});
});

/**
 * The scenarios are run in this process: a child process would need the options of Node.js that the real runs give it
 * (`--expose-gc`, type stripping), which not every runtime that runs the specs accepts. The scenario `load` reads the
 * heap after a collection, so it needs `--expose-gc` and is not run here.
 */
describe('the scenarios', () => {
	test('the file scenario reads the same data through each way and reports each one', async () => {
		const measurements = await scenarios.file?.({ iterations: 2 });
		expect(measurements?.map(measurement => measurement.name).toSorted()).toStrictEqual([
			'file-brotli-inflate-parse',
			'file-json-read-parse',
			'file-read-view',
		]);
		for (const measurement of measurements ?? []) {
			expect(measurement.values).toHaveLength(2);
			expect(measurement.values.every(value => value > 0)).toBe(true);
		}
	});

	test('the query scenario answers every question the same through the code of the packages, the objects and the bits', async () => {
		// it throws before any time is taken when the three answer differently
		const measurements = await scenarios.query?.({ iterations: 2 });
		expect(measurements?.map(measurement => measurement.name).toSorted()).toStrictEqual([
			'query-bits',
			'query-object',
			'query-today',
		]);
	});

	test('has the scenarios that the command runs', () => {
		expect(Object.keys(scenarios).toSorted()).toStrictEqual([
			'file',
			'lint-generated',
			'lint-validator',
			'load',
			'query',
		]);
	});
});

describe('the Rust scenarios', () => {
	const rust = {
		binary: '/target/release/examples/spec_baseline',
		index: '/data/index.json',
		questions: '/tmp/q.json',
	};

	test('are recognized by the name that has `rust-` in front of the scenario of the Rust program', () => {
		expect(RUST_SCENARIOS).toStrictEqual(['rust-load', 'rust-query', 'rust-view']);
		expect(isRustScenario('rust-query')).toBe(true);
		expect(isRustScenario('query')).toBe(false);
		expect(isRustScenario('rust-lint')).toBe(false);
	});

	test('start the program with the scenario, the data, the questions and the number of iterations', () => {
		expect(rustCommand('rust-query', rust, 20)).toStrictEqual({
			file: rust.binary,
			args: ['query', rust.index, rust.questions, '20'],
		});
	});

	test('refuse a name that is not one of them', () => {
		expect(() => rustCommand('rust-lint', rust, 20)).toThrow(/rust-load, rust-query, rust-view/);
	});

	test('cannot be run by a plan that has no Rust program', () => {
		expect(() =>
			runPerf({ seed: 1, scenarios: { 'rust-load': { processes: 1, options: { iterations: 2 } } } }),
		).toThrow(/--rust/);
	});

	test('say how to build the program when it is not there', () => {
		expect(() => rustBinary('/this/directory/does/not/exist')).toThrow(
			/cargo build --locked --release --workspace --example spec_baseline/,
		);
	});

	test('read the questions that are written from the data, with the answers of the data as objects', () => {
		const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-spec-'));
		try {
			const path = join(directory, 'questions.json');
			const spec = {
				def: { '#contentModels': { '#flow': ['a', 'div'] } },
				specs: [{ name: 'a' }, { name: 'div', deprecated: true }],
			};
			writeQuestionsFile(spec, path);
			const written = JSON.parse(readFileSync(path, 'utf8')) as {
				elements: string[];
				flags: number[];
				questions: number[];
				answers: number[];
			};
			expect(written.elements).toStrictEqual(['a', 'div']);
			expect(written.flags).toStrictEqual([0, 0b0010]);
			// both elements, the 4 flags and the 1 category of each
			expect(written.questions).toHaveLength(2 * (4 + 1) * 3);
			// the flags of `a`, the flags of `div` (the second is `deprecated`), then `#flow` for `a` and for `div`
			expect(written.answers).toStrictEqual([0, 0, 0, 0, 0, 1, 0, 0, 1, 1]);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe('pickValidatorFiles', () => {
	test('says what to do when the submodule of the validator is not there', () => {
		expect(() => pickValidatorFiles('/this/directory/does/not/exist', 10)).toThrow(/git submodule update --init/);
	});
});
