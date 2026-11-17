/**
 * The Rust half of `yarn spec-baseline perf --rust`: it starts the program of
 * `crates/markuplint-types/examples/spec_baseline.rs` for each sample, as `perf.ts` starts `perf-child.ts`, and the line
 * of measurements that it prints goes through the same collection and the same intervals.
 *
 * This file exists on the `v6` line only, because the crates do. What `perf.ts` and `cli.ts` hold of it is a hook
 * that any other program could use (a scenario that brings its own `run`), so that a change of `dev` to those files
 * does not meet a copy of this one at a merge.
 *
 * What the program is given:
 *
 * - the data as the TypeScript side hands it to the Rust engine: minified (`JSON.stringify` of the merged spec,
 *   which the engine of v6 does on every call). The file in the package is indented and a third larger, so
 *   the Rust program reads a minified copy that is written beside the questions;
 * - the questions of `layout.ts` with what the data as objects answers to each, and the bits that the program has to
 *   build from its own reading of the data in the same way: it stops before any time is taken when its three ways of
 *   answering, or its bits, differ from them.
 *
 * It is built beforehand and is not built here (`cargo build --locked --release --workspace --example
 * spec_baseline`, from `crates/`): a build is not a measurement, and the flags have to be those of the addon.
 *
 * @module
 */
import type { Measurement, PerfScenario } from './perf.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { askObject, assertQuestions, buildLayout, questionsFile, questionsOf, type SpecLike } from './layout.ts';
import { parseChildOutput } from './perf.ts';

/**
 * The scenarios that the Rust program runs, by the name that a plan gives them. The program's own name for each is the
 * part after `rust-`.
 */
export const RUST_SCENARIOS = ['rust-load', 'rust-query', 'rust-view'] as const;

/**
 * Whether a name of a plan is a scenario of the Rust program and not of `perf-child.ts`.
 *
 * @param name - The name of a scenario of a plan
 * @returns `true` for one of {@link RUST_SCENARIOS}
 */
export function isRustScenario(name: string): boolean {
	return (RUST_SCENARIOS as readonly string[]).includes(name);
}

/** What the Rust program is given: the program, the data that it reads and the questions that it asks of it. */
export interface RustPlan {
	readonly binary: string;
	readonly index: string;
	readonly questions: string;
}

/**
 * The command that runs a scenario of the Rust program.
 *
 * @param scenario - One of {@link RUST_SCENARIOS}
 * @param rust - The program and its inputs
 * @param iterations - How many iterations of the series
 * @returns The program and its arguments
 */
export function rustCommand(scenario: string, rust: RustPlan, iterations: number): { file: string; args: string[] } {
	if (!isRustScenario(scenario)) {
		throw new Error(
			`"${scenario}" is not a scenario of the Rust program. It is one of: ${RUST_SCENARIOS.join(', ')}`,
		);
	}
	return {
		file: rust.binary,
		args: [scenario.slice('rust-'.length), rust.index, rust.questions, String(iterations)],
	};
}

/** Runs a program and gives what it printed. It throws when the program fails, as `execFileSync` does. */
export type Exec = (file: string, args: readonly string[]) => string;

const execProgram: Exec = (file, args) =>
	execFileSync(file, [...args], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'inherit'],
	});

/**
 * Runs one scenario of the Rust program in a new process, as `runChild` of `perf.ts` does for the Node.js ones.
 *
 * @param scenario - One of {@link RUST_SCENARIOS}
 * @param rust - The program and its inputs
 * @param iterations - How many iterations of the series
 * @param exec - Runs the program
 * @returns What it measured
 */
export function runRustChild(
	scenario: string,
	rust: RustPlan,
	iterations: number,
	exec: Exec = execProgram,
): Measurement[] {
	const { file, args } = rustCommand(scenario, rust, iterations);
	return parseChildOutput(exec(file, args));
}

/** Gives the directory that cargo builds into, for a root of the repository. */
export type TargetDirectory = (root: string) => string;

/**
 * Asks cargo where it puts a build (`target_directory` of `cargo metadata`), which follows `CARGO_TARGET_DIR` and the
 * `target-dir` of a cargo configuration file.
 *
 * @param root - The root of the repository
 * @returns The directory
 */
export const cargoTargetDirectory: TargetDirectory = root => {
	const output = execFileSync(
		'cargo',
		[
			'metadata',
			'--manifest-path',
			join(root, 'crates/Cargo.toml'),
			'--locked',
			'--no-deps',
			'--format-version',
			'1',
		],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
	);
	return (JSON.parse(output) as { target_directory: string }).target_directory;
};

/**
 * Finds the Rust program that a `--release` build of the workspace made. A build for another target
 * (`--target <triple>`) puts it under `<target>/<triple>/release`, which is not read: build for the host.
 *
 * @param root - The root of the repository
 * @param targetDirectory - Gives the directory that cargo builds into
 * @returns The path of the program
 */
export function rustBinary(root: string, targetDirectory: TargetDirectory = cargoTargetDirectory): string {
	const binary = join(
		targetDirectory(root),
		'release/examples',
		process.platform === 'win32' ? 'spec_baseline.exe' : 'spec_baseline',
	);
	if (!existsSync(binary)) {
		throw new Error(
			`There is no ${binary}. Build it from crates/ with: cargo build --locked --release --workspace --example spec_baseline`,
		);
	}
	return binary;
}

/** The files of the crates that a build reads. */
const SOURCE = /(?:\.rs|Cargo\.toml|Cargo\.lock)$/;

/**
 * The newest of the sources that the program was built from: the Rust files, `Cargo.toml` and `Cargo.lock` under
 * `crates/`, leaving out what a build writes (`target`).
 *
 * @param root - The root of the repository
 * @returns The path and the time of modification of the newest one, or `null` when there is none
 */
export function newestSource(root: string): { path: string; mtimeMs: number } | null {
	let newest: { path: string; mtimeMs: number } | null = null;
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== 'target' && entry.name !== 'node_modules' && entry.name !== '.git') {
					walk(path);
				}
			} else if (SOURCE.test(entry.name)) {
				const { mtimeMs } = statSync(path);
				if (!newest || mtimeMs > newest.mtimeMs) {
					newest = { path, mtimeMs };
				}
			}
		}
	};
	walk(join(root, 'crates'));
	return newest;
}

/**
 * Stops for a program that is older than the sources of the crates: it measures code that is gone, and its figures
 * would be set beside those of the current TypeScript.
 *
 * @param root - The root of the repository
 * @param binary - The path of the program
 */
export function assertFresh(root: string, binary: string): void {
	const newest = newestSource(root);
	if (newest && newest.mtimeMs > statSync(binary).mtimeMs) {
		throw new Error(
			`${binary} is older than ${newest.path}. Build it again from crates/ with: cargo build --locked --release --workspace --example spec_baseline`,
		);
	}
}

/**
 * Writes the file that the Rust program asks its questions from: the questions of `layout.ts`, with what the
 * data as objects answers to each, and the bits that the program has to build the same way.
 *
 * @param spec - The data
 * @param path - Where to write it
 */
export function writeQuestionsFile(spec: SpecLike, path: string): void {
	const layout = buildLayout(spec);
	const questions = questionsOf(layout);
	assertQuestions(layout, questions);
	writeFileSync(path, JSON.stringify(questionsFile(layout, questions, askObject(spec, layout, questions))));
}

/**
 * The version of the Rust compiler, for the record of where a figure was taken.
 *
 * @returns The line that `rustc --version` prints
 */
export function rustVersion(): string {
	return execFileSync('rustc', ['--version'], { encoding: 'utf8' }).trim();
}

/** What {@link prepareRust} gives. */
export interface PreparedRust {
	/** The scenarios to add to a plan, each with the `run` that starts the program. */
	readonly scenarios: Readonly<Record<string, PerfScenario & Required<Pick<PerfScenario, 'run'>>>>;
	/** The version of the compiler, for the record. */
	readonly rustc: string;
	/** When the program was built: a program older than the source of the example measures code that is gone. */
	readonly built: string;
	/** Removes the directory that the inputs were written to. */
	readonly cleanup: () => void;
}

/** What {@link prepareRust} reads from outside. */
export interface PrepareOptions {
	/** The path of the data, from the root. */
	readonly specPath: string;
	readonly processes: number;
	readonly iterations: number;
	/** Gives the version of the compiler. */
	readonly version?: () => string;
	/** Runs the program. */
	readonly exec?: Exec;
	/** Gives the directory that cargo builds into. */
	readonly targetDirectory?: TargetDirectory;
}

/**
 * Makes what the scenarios of the Rust program need: finds the program, and writes the minified data and the
 * questions into a directory of its own, which {@link PreparedRust.cleanup} removes. What can fail without
 * touching the disk (the program, the compiler) is asked first, so that a failure leaves no directory behind.
 *
 * @param root - The root of the repository
 * @param options - The data, the plan and what to read from outside
 * @returns The scenarios, the compiler, and the way to clean up
 */
export function prepareRust(root: string, options: PrepareOptions): PreparedRust {
	const binary = rustBinary(root, options.targetDirectory);
	assertFresh(root, binary);
	const rustc = (options.version ?? rustVersion)();
	const built = statSync(binary).mtime.toISOString();
	const spec = JSON.parse(readFileSync(join(root, options.specPath), 'utf8')) as SpecLike;

	const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-rust-'));
	const cleanup = () => rmSync(directory, { recursive: true, force: true });
	try {
		const plan: RustPlan = {
			binary,
			index: join(directory, 'index.min.json'),
			questions: join(directory, 'questions.json'),
		};
		writeFileSync(plan.index, JSON.stringify(spec));
		writeQuestionsFile(spec, plan.questions);
		const scenarios = Object.fromEntries(
			RUST_SCENARIOS.map(name => [
				name,
				{
					processes: options.processes,
					options: { iterations: options.iterations },
					run: (iterations: number) => runRustChild(name, plan, iterations, options.exec),
				},
			]),
		);
		return { scenarios, rustc, built, cleanup };
	} catch (error) {
		cleanup();
		throw error;
	}
}
