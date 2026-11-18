/**
 * The plan of `yarn spec-baseline perf --packed`: what is measured of the candidates, in both languages, one process for each sample.
 *
 * - The TypeScript scenarios are those of `child.ts`, started with `--expose-gc --experimental-strip-types` as `perf.ts` starts its own:
 *   `open`, `query` and `compose` for each candidate, with the strings compared as bytes, and `open` and `query` again with the
 *   strings decoded (the two ways of comparing a name with a key); `objects` is the baseline, and `hash` the two hash functions.
 * - The Rust scenarios are those of `crates/markuplint-types/examples/packed_candidates/`: `load`, `query` and `compose` for each candidate,
 *   `value` (the baseline: the JSON as `serde_json::Value`) and `hash`. The program is built beforehand with `cargo build
 *   --locked --release --workspace --example packed_candidates` (from `crates/`), as `rust.ts` has it for `spec_baseline`, and the run
 *   stops for a program older than the sources.
 *
 * What the programs are given is written first (`prepare.ts`), and the Rust program checks, for each candidate and before any
 * time is taken, that it makes the same bytes as this side (the packed spec, and the spec composed with each extension), opens them, answers
 * every question as the data does, and refuses a file that was changed: a figure of a program that differs is not a measurement.
 *
 * The names of the figures are `<language>:<candidate>:<how strings are compared, for TypeScript>:<what>` for a candidate and
 * `objects:<what>` or `rust:value-<what>` for the baselines.
 *
 * @module
 */
import type { Measurement, PerfScenario } from '../perf.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseChildOutput } from '../perf.ts';
import { assertFresh, cargoTargetDirectory, rustVersion, type Exec, type TargetDirectory } from '../rust.ts';
import { VARIANTS } from './format.ts';
import { stemOf, writeInputs, type InputOptions } from './prepare.ts';

const CHILD = fileURLToPath(new URL('child.ts', import.meta.url));

/** The scenarios that are started for each candidate, in the TypeScript program: with the strings compared as bytes, and decoded. */
const TS_PHASES = { bytes: ['open', 'query', 'compose'], decoded: ['open', 'query'] } as const;

/** The scenarios of the Rust program that are started for each candidate. */
const RUST_PHASES = ['load', 'query', 'compose'] as const;

/**
 * Finds the Rust program that a `--release` build of the workspace made.
 *
 * @param root - The root of the repository
 * @param targetDirectory - Gives the directory that cargo builds into
 * @returns The path of the program
 */
export function packedBinary(root: string, targetDirectory: TargetDirectory = cargoTargetDirectory): string {
	const binary = join(
		targetDirectory(root),
		'release/examples',
		process.platform === 'win32' ? 'packed_candidates.exe' : 'packed_candidates',
	);
	if (!existsSync(binary)) {
		throw new Error(
			`There is no ${binary}. Build it from crates/ with: cargo build --locked --release --workspace --example packed_candidates`,
		);
	}
	return binary;
}

/**
 * The name that a figure of the Rust program has here.
 *
 * @param stem - The candidate, or `-` for a scenario that has none
 * @param reported - The name that the program printed, such as `packed-rust-open`
 * @returns For example `rust:rows-sorted-murmur3:open`
 */
export function rustName(stem: string, reported: string): string {
	const metric = reported.replace(/^packed-rust-/u, '');
	return stem === '-' ? `rust:${metric}` : `rust:${stem}:${metric}`;
}

/** Runs a program and gives what it printed; it throws when the program fails. */
const execProgram: Exec = (file, args) =>
	execFileSync(file, [...args], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'inherit'],
	});

/**
 * Runs one scenario of the Rust program in a new process.
 *
 * @param binary - The program
 * @param scenario - `load`, `query`, `compose`, `value` or `hash`
 * @param stem - The candidate, or `-`
 * @param directory - What `prepare.ts` wrote
 * @param iterations - How many iterations
 * @param exec - Runs the program
 * @returns What it measured, with the names of this side
 */
export function runRustPacked(
	binary: string,
	scenario: string,
	stem: string,
	directory: string,
	iterations: number,
	exec: Exec = execProgram,
): Measurement[] {
	const output = exec(binary, [scenario, stem, directory, String(iterations)]);
	return parseChildOutput(output).map(measurement => ({ ...measurement, name: rustName(stem, measurement.name) }));
}

/**
 * Runs one scenario of `child.ts` in a new process.
 *
 * @param scenario - `open`, `query`, `compose`, `objects` or `hash`
 * @param options - What it is given
 * @param options.dir - What `prepare.ts` wrote
 * @param options.iterations - How many iterations
 * @param options.stem - The candidate
 * @param options.compare - How strings are compared
 * @returns What it measured
 */
export function runTsPacked(
	scenario: string,
	options: { dir: string; iterations: number; stem?: string; compare?: 'bytes' | 'decoded' },
): Measurement[] {
	const output = execFileSync(
		process.execPath,
		['--expose-gc', '--experimental-strip-types', '--no-warnings', CHILD, scenario, JSON.stringify(options)],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
	);
	return parseChildOutput(output);
}

/** What {@link preparePacked} reads from outside. */
export interface PreparePackedOptions extends InputOptions {
	readonly processes: number;
	readonly iterations: number;
	/** Gives the version of the compiler. */
	readonly version?: () => string;
	/** Runs the Rust program. */
	readonly exec?: Exec;
	/** Gives the directory that cargo builds into. */
	readonly targetDirectory?: TargetDirectory;
}

/** What {@link preparePacked} gives. */
export interface PreparedPacked {
	/** The scenarios to add to a plan, each with the `run` that starts the program. */
	readonly scenarios: Readonly<Record<string, PerfScenario & Required<Pick<PerfScenario, 'run'>>>>;
	readonly rustc: string;
	/** When the Rust program was built. */
	readonly built: string;
	/** Removes the directory that the inputs were written to. */
	readonly cleanup: () => void;
}

/**
 * Makes what the scenarios need: finds the Rust program, writes the inputs into a directory of its own, has the Rust program check
 * every candidate, and gives the scenarios. What can fail without touching the disk (the program, the compiler) is asked first.
 *
 * @param root - The root of the repository
 * @param options - The plan and what to read from outside
 * @returns The scenarios, the compiler, and the way to clean up
 */
export function preparePacked(root: string, options: PreparePackedOptions): PreparedPacked {
	const binary = packedBinary(root, options.targetDirectory);
	assertFresh(root, binary);
	const rustc = (options.version ?? rustVersion)();
	const built = statSync(binary).mtime.toISOString();

	const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-packed-'));
	const cleanup = () => rmSync(directory, { recursive: true, force: true });
	try {
		const written = writeInputs(root, directory, options);
		const exec = options.exec ?? execProgram;
		for (const stem of written.variants) {
			// the Rust program stops, with the reason, for a candidate that it does not make or read as this side does
			exec(binary, ['check', stem, directory, '1']);
		}

		const scenarios: Record<string, PerfScenario & Required<Pick<PerfScenario, 'run'>>> = {};
		const add = (key: string, run: (iterations: number) => Measurement[]) => {
			scenarios[key] = { processes: options.processes, options: { iterations: options.iterations }, run };
		};
		for (const variant of VARIANTS) {
			const stem = stemOf(variant);
			for (const [compare, phases] of Object.entries(TS_PHASES)) {
				for (const phase of phases) {
					add(`ts:${stem}:${compare}:${phase}`, iterations =>
						runTsPacked(phase, {
							dir: directory,
							iterations,
							stem,
							compare: compare as 'bytes' | 'decoded',
						}),
					);
				}
			}
			for (const phase of RUST_PHASES) {
				add(`rust:${stem}:${phase}`, iterations =>
					runRustPacked(binary, phase, stem, directory, iterations, exec),
				);
			}
		}
		for (const phase of ['objects', 'hash']) {
			add(`ts:${phase}`, iterations => runTsPacked(phase, { dir: directory, iterations }));
		}
		for (const phase of ['value', 'hash']) {
			add(`rust:${phase}`, iterations => runRustPacked(binary, phase, '-', directory, iterations, exec));
		}
		return { scenarios, rustc, built, cleanup };
	} catch (error) {
		cleanup();
		throw error;
	}
}
