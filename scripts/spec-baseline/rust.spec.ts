import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { runPerf } from './perf.ts';
import {
	isRustScenario,
	prepareRust,
	runRustChild,
	rustBinary,
	rustCommand,
	RUST_SCENARIOS,
	writeQuestionsFile,
} from './rust.ts';

const PROGRAM = process.platform === 'win32' ? 'spec_baseline.exe' : 'spec_baseline';

/** A root of a repository that has the program (an empty file) and the data (a small one), for `prepareRust`. */
function repository(): { root: string; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), 'spec-baseline-fake-repo-'));
	mkdirSync(join(root, 'crates/target/release/examples'), { recursive: true });
	writeFileSync(join(root, 'crates/target/release/examples', PROGRAM), '');
	mkdirSync(join(root, 'data'), { recursive: true });
	writeFileSync(
		join(root, 'data/index.json'),
		JSON.stringify(
			{
				def: { '#contentModels': { '#flow': ['a', 'div'] } },
				specs: [{ name: 'a' }, { name: 'div', deprecated: true }],
			},
			undefined,
			'\t',
		),
	);
	return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const rust = { binary: '/target/release/examples/spec_baseline', index: '/data/index.json', questions: '/tmp/q.json' };

describe('the scenarios of the Rust program', () => {
	test('are recognized by the name that has `rust-` in front of the scenario of the program', () => {
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

	test('read what the program printed after anything else that it printed', () => {
		const measurements = runRustChild('rust-load', rust, 5, (file, args) => {
			expect(file).toBe(rust.binary);
			expect(args).toStrictEqual(['load', rust.index, rust.questions, '5']);
			return 'a warning\n{"measurements":[{"name":"rust-file-json-read-parse","unit":"ms","values":[1,2]}]}\n';
		});
		expect(measurements).toStrictEqual([{ name: 'rust-file-json-read-parse', unit: 'ms', values: [1, 2] }]);
	});

	test('are not taken as measured when the program fails', () => {
		expect(() =>
			runRustChild('rust-view', rust, 5, () => {
				throw new Error('Command failed: spec_baseline');
			}),
		).toThrow(/Command failed/);
		expect(() => runRustChild('rust-view', rust, 5, () => 'it printed no measurements')).toThrow(/measurements/);
	});
});

describe('rustBinary', () => {
	test('says how to build the program when it is not there', () => {
		expect(() => rustBinary('/this/directory/does/not/exist', {})).toThrow(
			/cargo build --locked --release --workspace --example spec_baseline/,
		);
	});

	test('finds it in crates/target, and where CARGO_TARGET_DIR puts it (a relative one from crates/)', () => {
		const { root, cleanup } = repository();
		try {
			expect(rustBinary(root, {})).toBe(join(root, 'crates/target/release/examples', PROGRAM));

			mkdirSync(join(root, 'crates/elsewhere/release/examples'), { recursive: true });
			writeFileSync(join(root, 'crates/elsewhere/release/examples', PROGRAM), '');
			expect(rustBinary(root, { CARGO_TARGET_DIR: 'elsewhere' })).toBe(
				join(root, 'crates/elsewhere/release/examples', PROGRAM),
			);
			expect(() => rustBinary(root, { CARGO_TARGET_DIR: 'nowhere' })).toThrow(
				new RegExp(join(root, 'crates/nowhere').replaceAll('\\', '\\\\')),
			);
		} finally {
			cleanup();
		}
	});
});

describe('writeQuestionsFile', () => {
	test('writes the questions of the data with the answers of the data as objects', () => {
		const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-fake-repo-'));
		try {
			const path = join(directory, 'questions.json');
			writeQuestionsFile(
				{
					def: { '#contentModels': { '#flow': ['a', 'div'] } },
					specs: [{ name: 'a' }, { name: 'div', deprecated: true }],
				},
				path,
			);
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

describe('prepareRust', () => {
	test('writes the data minified and the questions, and gives the scenarios that start the program with them', () => {
		const { root, cleanup: cleanupRoot } = repository();
		const calls: { file: string; args: readonly string[] }[] = [];
		const prepared = prepareRust(root, {
			specPath: 'data/index.json',
			processes: 3,
			iterations: 7,
			version: () => 'rustc 1.2.3',
			exec: (file, args) => {
				calls.push({ file, args });
				return '{"measurements":[{"name":"rust-x","unit":"ms","values":[1]}]}';
			},
			env: {},
		});
		let directory = '';
		try {
			expect(prepared.rustc).toBe('rustc 1.2.3');
			expect(Number.isNaN(Date.parse(prepared.built))).toBe(false);
			expect(Object.keys(prepared.scenarios)).toStrictEqual([...RUST_SCENARIOS]);
			expect(prepared.scenarios['rust-load']).toMatchObject({ processes: 3, options: { iterations: 7 } });

			prepared.scenarios['rust-query']?.run(7);
			const [call] = calls;
			expect(call?.file).toBe(join(root, 'crates/target/release/examples', PROGRAM));
			const [scenario, index = '', questions = '', iterations] = call?.args ?? [];
			expect([scenario, iterations]).toStrictEqual(['query', '7']);
			directory = dirname(questions);
			// the data is the minified text of the file that is indented
			const data = readFileSync(join(root, 'data/index.json'), 'utf8');
			expect(data).toContain('\n');
			expect(readFileSync(index, 'utf8')).toBe(JSON.stringify(JSON.parse(data)));
			expect(JSON.parse(readFileSync(questions, 'utf8'))).toHaveProperty('answers');
		} finally {
			prepared.cleanup();
			cleanupRoot();
		}
		expect(existsSync(directory)).toBe(false);
	});

	test('runs through runPerf, as the scenarios of the Node.js programs do, with what the program printed', () => {
		const { root, cleanup } = repository();
		const prepared = prepareRust(root, {
			specPath: 'data/index.json',
			processes: 2,
			iterations: 3,
			version: () => 'rustc 1.2.3',
			exec: () => '{"measurements":[{"name":"rust-x","unit":"ms","values":[5,1,1]}]}',
			env: {},
		});
		try {
			const result = runPerf({ seed: 1, scenarios: { 'rust-view': prepared.scenarios['rust-view'] as never } });
			expect(result['rust-x']?.processes).toStrictEqual([
				[5, 1, 1],
				[5, 1, 1],
			]);
		} finally {
			prepared.cleanup();
			cleanup();
		}
	});

	test('leaves no directory behind when what it writes fails, and none when the compiler is not there', () => {
		const before = readdirSync(tmpdir()).filter(name => name.startsWith('spec-baseline-rust-'));
		const { root, cleanup } = repository();
		try {
			expect(() =>
				prepareRust(root, {
					specPath: 'data/missing.json',
					processes: 1,
					iterations: 2,
					version: () => 'rustc 1.2.3',
					env: {},
				}),
			).toThrow(/missing\.json/);
			expect(() =>
				prepareRust(root, {
					specPath: 'data/index.json',
					processes: 1,
					iterations: 2,
					version: () => {
						throw new Error('spawnSync rustc ENOENT');
					},
					env: {},
				}),
			).toThrow(/rustc ENOENT/);
			expect(readdirSync(tmpdir()).filter(name => name.startsWith('spec-baseline-rust-'))).toStrictEqual(before);
		} finally {
			cleanup();
		}
	});
});
