import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { scenarios } from './child.ts';
import { EXTENSIONS } from './extensions.ts';
import { stemOf, writeInputs } from './prepare.ts';
import { VARIANTS } from './format.ts';
import { packedBinary, preparePacked, runRustPacked, runTsPacked, rustName } from './run.ts';

const ROOT = join(import.meta.dirname, '../../..');

let work = '';
let html = '';
let directory = '';

beforeAll(() => {
	work = mkdtempSync(join(tmpdir(), 'packed-run-spec-'));
	html = join(work, 'a.html');
	writeFileSync(
		html,
		'<!doctype html><html lang="en"><head><title>t</title></head><body><div class="a" role="button" aria-label="x" x-y><p>t</p><my-el></my-el></div></body></html>',
	);
	directory = join(work, 'inputs');
	writeInputs(ROOT, directory, { files: [html], streamLimit: 200 });
});

afterAll(() => {
	rmSync(work, { recursive: true, force: true });
});

describe('rustName', () => {
	test('puts the candidate between the language and what is measured, and leaves it out for a baseline', () => {
		expect(rustName('rows-sorted-murmur3', 'packed-rust-open')).toBe('rust:rows-sorted-murmur3:open');
		expect(rustName('-', 'packed-rust-value-load')).toBe('rust:value-load');
		expect(rustName('-', 'packed-rust-hash-murmur3')).toBe('rust:hash-murmur3');
	});
});

describe('writeInputs', () => {
	test('writes the spec, the questions, the extensions, and a file for each candidate and each extension of it', () => {
		for (const name of ['index.min.json', 'questions.json', 'extensions.json']) {
			expect(existsSync(join(directory, name))).toBe(true);
		}
		for (const variant of VARIANTS) {
			const stem = stemOf(variant);
			expect(existsSync(join(directory, `${stem}.bin`))).toBe(true);
			for (const extension of Object.keys(EXTENSIONS)) {
				expect(existsSync(join(directory, `${stem}.${extension}.bin`))).toBe(true);
			}
		}
	});

	test('names a candidate without the characters of a path', () => {
		expect(VARIANTS.map(variant => stemOf(variant))).toContain('rows-sorted-murmur3');
		expect(VARIANTS.map(variant => stemOf(variant)).every(stem => /^[a-z0-9-]+$/u.test(stem))).toBe(true);
	});
});

describe('runRustPacked', () => {
	test('renames what the program printed, and passes the scenario, the candidate, the directory and the iterations', () => {
		const calls: (readonly string[])[] = [];
		const measurements = runRustPacked('/bin/p', 'load', 'rows-sorted-murmur3', '/dir', 3, (file, args) => {
			calls.push([file, ...args]);
			return `noise\n${JSON.stringify({ measurements: [{ name: 'packed-rust-open', unit: 'ms', values: [1, 2, 3] }] })}\n`;
		});
		expect(calls).toStrictEqual([['/bin/p', 'load', 'rows-sorted-murmur3', '/dir', '3']]);
		expect(measurements).toStrictEqual([{ name: 'rust:rows-sorted-murmur3:open', unit: 'ms', values: [1, 2, 3] }]);
	});

	test('stops for a program that prints no measurements', () => {
		expect(() => runRustPacked('/bin/p', 'load', '-', '/dir', 1, () => 'nothing\n')).toThrow('no measurements');
	});
});

describe('packedBinary', () => {
	test('names the command that builds the program when it is not there', () => {
		expect(() => packedBinary(ROOT, () => join(work, 'no-target'))).toThrow(
			'cargo build --locked --release --workspace --example packed_candidates',
		);
	});
});

describe('preparePacked', () => {
	/** A target directory with a program in it that is newer than every source of the crates. */
	function fakeTarget(): string {
		const target = join(work, `target-${Math.random().toString(36).slice(2)}`);
		const examples = join(target, 'release/examples');
		const binary = join(examples, process.platform === 'win32' ? 'packed_candidates.exe' : 'packed_candidates');
		mkdirSync(examples, { recursive: true });
		writeFileSync(binary, '');
		const later = new Date(Date.now() + 60_000);
		utimesSync(binary, later, later);
		return target;
	}

	test('has the Rust program check every candidate and gives the scenarios of both languages', () => {
		const calls: (readonly string[])[] = [];
		const prepared = preparePacked(ROOT, {
			processes: 2,
			iterations: 3,
			files: [html],
			streamLimit: 100,
			version: () => 'rustc test',
			targetDirectory: () => fakeTarget(),
			exec: (file, args) => {
				calls.push([...args]);
				return `${JSON.stringify({ measurements: [] })}\n`;
			},
		});
		try {
			expect(calls.filter(call => call[0] === 'check')).toHaveLength(VARIANTS.length);
			expect(calls.every(call => call[0] === 'check')).toBe(true);
			const keys = Object.keys(prepared.scenarios);
			// TypeScript: three for each candidate with the strings as bytes, two with them decoded, the baseline and the hashes;
			// Rust: three for each candidate, the baseline and the hashes
			expect(keys).toHaveLength(VARIANTS.length * (3 + 2 + 3) + 4);
			expect(keys).toContain('ts:rows-sorted-murmur3:bytes:open');
			expect(keys).toContain('ts:columns-pow2-xxhash32:decoded:query');
			expect(keys).toContain('rust:columns-minimal-murmur3:compose');
			expect(keys).toContain('ts:objects');
			expect(keys).toContain('rust:value');
			expect(prepared.rustc).toBe('rustc test');
			expect(prepared.scenarios['rust:rows-sorted-murmur3:load']?.processes).toBe(2);
			prepared.scenarios['rust:rows-sorted-murmur3:query']?.run(5);
			expect(calls.at(-1)?.slice(0, 2)).toStrictEqual(['query', 'rows-sorted-murmur3']);
			expect(calls.at(-1)?.[3]).toBe('5');
		} finally {
			prepared.cleanup();
		}
	});

	test('measures the files that it wrote, raw, gzip and Brotli, with the JSON of the spec beside them', () => {
		const prepared = preparePacked(ROOT, {
			processes: 1,
			iterations: 2,
			files: [html],
			streamLimit: 100,
			version: () => 'rustc test',
			targetDirectory: () => fakeTarget(),
			exec: () => `${JSON.stringify({ measurements: [] })}\n`,
		});
		try {
			const [first] = VARIANTS;
			if (!first) {
				throw new Error('no candidate');
			}
			const { candidates, baseline } = prepared.sizes([first]);
			expect(candidates.map(size => size.stem)).toStrictEqual([stemOf(first)]);
			expect(candidates[0]?.raw).toBe(readFileSync(join(directory, `${stemOf(first)}.bin`)).length);
			expect(candidates[0]?.gzip).toBeGreaterThan(0);
			expect(candidates[0]?.brotli).toBeGreaterThan(0);
			expect(baseline.raw).toBeGreaterThan(candidates[0]?.raw ?? 0);
		} finally {
			prepared.cleanup();
		}
	}, 120_000);

	test('removes what it wrote when the Rust program refuses a candidate', () => {
		let directoryOfRun = '';
		expect(() =>
			preparePacked(ROOT, {
				processes: 1,
				iterations: 2,
				files: [html],
				streamLimit: 100,
				version: () => 'rustc test',
				targetDirectory: () => fakeTarget(),
				exec: (_file, args) => {
					directoryOfRun = args[2] ?? '';
					throw new Error('the bytes differ');
				},
			}),
		).toThrow('the bytes differ');
		expect(directoryOfRun).not.toBe('');
		expect(existsSync(directoryOfRun)).toBe(false);
	});

	test('stops for a program that is older than the sources of the crates', () => {
		const target = join(work, 'old-target');
		const examples = join(target, 'release/examples');
		mkdirSync(examples, { recursive: true });
		const binary = join(examples, process.platform === 'win32' ? 'packed_candidates.exe' : 'packed_candidates');
		writeFileSync(binary, '');
		const earlier = new Date(0);
		utimesSync(binary, earlier, earlier);
		expect(() =>
			preparePacked(ROOT, { processes: 1, iterations: 2, files: [html], targetDirectory: () => target }),
		).toThrow('is older than');
	});
});

describe('the scenarios of child.ts', () => {
	test('answer the questions as the data does, in the numbers of the measurements that are reported', () => {
		const options = { iterations: 2, dir: directory, stem: 'columns-minimal-murmur3' };
		for (const [scenario, expected] of [
			[
				'query',
				[
					'ts:columns-minimal-murmur3:bytes:bits',
					'ts:columns-minimal-murmur3:bytes:paths',
					'ts:columns-minimal-murmur3:bytes:stream',
				],
			],
			[
				'compose',
				Object.keys(EXTENSIONS).map(extension => `ts:columns-minimal-murmur3:bytes:compose-${extension}`),
			],
			[
				'objects',
				[
					'objects:load',
					'objects:heap-after-load',
					'objects:bits',
					'objects:paths',
					'objects:stream',
					...Object.keys(EXTENSIONS).map(extension => `objects:compose-${extension}`),
				],
			],
			['hash', ['hash:murmur3', 'hash:xxhash32']],
		] as const) {
			const measurements = scenarios[scenario]?.(options) ?? [];
			expect(measurements.map(measurement => measurement.name)).toStrictEqual(expected);
			for (const measurement of measurements.filter(item => item.unit === 'ms')) {
				expect(measurement.values).toHaveLength(2);
				expect(measurement.values.every(value => value >= 0)).toBe(true);
			}
		}
	});

	test('stop for a candidate that answers differently from the data', () => {
		const wrong = join(work, 'wrong');
		writeInputs(ROOT, wrong, { files: [html], streamLimit: 100 });
		// a questions file whose answer is not the one that the data gives
		const path = join(wrong, 'questions.json');
		const questions = JSON.parse(readFileSync(path, 'utf8')) as { bitAnswers: number[] };
		questions.bitAnswers[0] = 1 - (questions.bitAnswers[0] ?? 0);
		writeFileSync(path, JSON.stringify(questions));
		expect(() => scenarios.query?.({ iterations: 2, dir: wrong, stem: 'rows-sorted-murmur3' })).toThrow(
			'bits answers differently',
		);
	});

	test('is run in a process of its own, with the memory figures, for the opening of a file', () => {
		const measurements = runTsPacked('open', {
			dir: directory,
			iterations: 2,
			stem: 'rows-minimal-xxhash32',
			compare: 'decoded',
		});
		expect(measurements.map(measurement => measurement.name)).toStrictEqual([
			'ts:rows-minimal-xxhash32:decoded:open',
			'ts:rows-minimal-xxhash32:decoded:crc',
			'ts:rows-minimal-xxhash32:decoded:heap-after-open',
		]);
		// the words of the file are in a buffer outside the heap of V8, and the figure counts them
		expect(measurements[2]?.values[0]).toBeGreaterThanOrEqual(
			statSync(join(directory, 'rows-minimal-xxhash32.bin')).size,
		);
	});
});
