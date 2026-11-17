/**
 * Times what a spec format changes, one process for each sample.
 *
 * The scenarios are in `perf-child.ts`; this file starts them, and turns what they report into a
 * table or a comparison. The design follows the methods that the timings of a managed runtime
 * need (see `stats.ts`):
 *
 * - Each sample is a fresh process, and the samples of the scenarios are interleaved in a random
 *   order from a seed, so that a slow minute of the machine falls on every scenario and not on one.
 * - The first iteration of a series is reported apart from the rest: the first is what a short-lived
 *   process pays (the CLI), the rest is what a long-lived one pays (the language server), and a
 *   mean over both would describe neither.
 * - A figure comes with an interval, and a comparison is a ratio with an interval: a change
 *   whose interval contains 1 is not a change that was measured.
 *
 * Nothing of a result is written into the repository. A figure depends on the machine and the
 * version of Node.js, so it is read in the context of the environment that {@link environment}
 * records with it, and a later comparison is made by measuring both sides on one machine
 * (`compareResults`), not against a number that was written down.
 *
 * @module
 */
import type { ChildOptions } from './perf-child.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareText } from './fixtures.ts';
import { askObject, assertQuestions, buildLayout, questionsFile, questionsOf, type SpecLike } from './layout.ts';
import { bootstrapCI, mulberry32, ratioCI, type BootstrapOptions } from './stats.ts';

/** What a scenario reports for one name: the iterations of one process. */
export interface Measurement {
	readonly name: string;
	readonly unit: 'ms' | 'bytes';
	/** The iterations in the order they ran. The first is a cold one. */
	readonly values: number[];
}

/** One name over all the processes. */
export interface Series {
	readonly unit: 'ms' | 'bytes';
	/** One list of iterations for each process. */
	readonly processes: number[][];
}

/** The series of each name. */
export type Result = Record<string, Series>;

/**
 * Orders the runs of the scenarios at random, so that none of them has the same neighbours in
 * every sample.
 *
 * @param counts - How many runs each scenario has
 * @param seed - The seed of the order
 * @returns The scenario of each run, in the order to run them
 */
export function interleave(counts: Readonly<Record<string, number>>, seed: number): string[] {
	const runs = Object.entries(counts).flatMap(([name, count]) => Array.from({ length: count }, () => name));
	const random = mulberry32(seed);
	for (let i = runs.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[runs[i], runs[j]] = [runs[j] ?? '', runs[i] ?? ''];
	}
	return runs;
}

/**
 * Reads what a child printed.
 *
 * @param output - The standard output of the child, which the code under test may have written to as well
 * @returns The measurements of the last line that is a JSON object with `measurements`
 */
export function parseChildOutput(output: string): Measurement[] {
	for (const line of output.split('\n').toReversed()) {
		if (!line.startsWith('{')) {
			continue;
		}
		try {
			const parsed = JSON.parse(line) as { measurements?: Measurement[] };
			if (parsed.measurements) {
				return parsed.measurements;
			}
		} catch {
			// not the line that was looked for
		}
	}
	throw new Error('The child printed no measurements');
}

const CHILD = fileURLToPath(new URL('perf-child.ts', import.meta.url));

/**
 * Runs one scenario in a new process.
 *
 * @param scenario - The name of a scenario of `perf-child.ts`
 * @param options - What the scenario is given
 * @returns What it measured
 */
export function runChild(scenario: string, options: ChildOptions): Measurement[] {
	const output = execFileSync(
		process.execPath,
		['--expose-gc', '--experimental-strip-types', '--no-warnings', CHILD, scenario, JSON.stringify(options)],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
	);
	return parseChildOutput(output);
}

/**
 * Gathers the measurements of the processes by name.
 *
 * @param perProcess - What each process reported, in the order they ran
 * @returns The series of each name
 */
export function collect(perProcess: readonly (readonly Measurement[])[]): Result {
	const result: Record<string, { unit: 'ms' | 'bytes'; processes: number[][] }> = {};
	for (const measurements of perProcess) {
		for (const { name, unit, values } of measurements) {
			const series = (result[name] ??= { unit, processes: [] });
			if (series.unit !== unit) {
				throw new Error(`"${name}" is reported in two units: ${series.unit} and ${unit}`);
			}
			series.processes.push([...values]);
		}
	}
	return result;
}

/** The part of a series that a figure is about. */
type Part = 'first' | 'rest';

function partOf(series: Series, part: Part): number[][] | null {
	if (part === 'first') {
		return series.processes.map(values => values.slice(0, 1));
	}
	const rest = series.processes.map(values => values.slice(1));
	return rest.every(values => values.length > 0) ? rest : null;
}

function format(value: number, unit: 'ms' | 'bytes'): string {
	return unit === 'ms' ? value.toFixed(3) : Math.round(value).toLocaleString('en-US');
}

/**
 * Renders a result as a table of means with their intervals.
 *
 * @param result - The series
 * @param options - The bootstrap
 * @returns The table, one row for the first iteration and one for the rest of each name that has more than one iteration
 */
export function renderTable(result: Result, options: BootstrapOptions): string {
	const rows: string[][] = [['name', 'unit', 'part', 'mean [95% interval]', 'processes']];
	for (const [name, series] of Object.entries(result)) {
		for (const part of ['first', 'rest'] as const) {
			const data = partOf(series, part);
			if (!data || (part === 'rest' && series.processes.every(values => values.length < 2))) {
				continue;
			}
			// A series with one value has no "rest", and its single figure is reported as it is.
			const label = series.processes.every(values => values.length === 1) ? '' : part;
			const ci = bootstrapCI(data, options);
			rows.push([
				name,
				series.unit,
				label,
				`${format(ci.mean, series.unit)} [${format(ci.low, series.unit)}, ${format(ci.high, series.unit)}]`,
				String(series.processes.length),
			]);
			if (label === '') {
				break;
			}
		}
	}
	const widths = rows[0]?.map((_, column) => Math.max(...rows.map(row => (row[column] ?? '').length))) ?? [];
	return rows.map(row => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ')).join('\n');
}

/** One ratio of a comparison. */
export interface ComparisonRow {
	readonly name: string;
	readonly part: Part;
	/** The mean of the second result over the mean of the first. */
	readonly ratio: number;
	readonly low: number;
	readonly high: number;
}

/**
 * Compares two results measured on one machine.
 *
 * @param before - The first result
 * @param after - The second result
 * @param options - The bootstrap
 * @returns For each name that both have, the ratio of the second to the first, for the first iterations and for the rest
 */
export function compareResults(before: Result, after: Result, options: BootstrapOptions): ComparisonRow[] {
	const rows: ComparisonRow[] = [];
	for (const [name, a] of Object.entries(before)) {
		const b = after[name];
		if (!b) {
			continue;
		}
		for (const part of ['first', 'rest'] as const) {
			const left = partOf(a, part);
			const right = partOf(b, part);
			if (!left || !right) {
				continue;
			}
			const ci = ratioCI(right, left, options);
			rows.push({ name, part, ratio: ci.ratio, low: ci.low, high: ci.high });
		}
	}
	return rows;
}

/**
 * Renders a comparison in words that do not overstate it.
 *
 * @param rows - The rows of {@link compareResults}
 * @returns One line for each row
 */
export function renderComparison(rows: readonly ComparisonRow[]): string {
	return rows
		.map(row => {
			const verdict = row.high < 1 ? 'lower' : row.low > 1 ? 'higher' : 'no difference measured';
			return `${row.name} (${row.part}): ${row.ratio.toFixed(3)} [${row.low.toFixed(3)}, ${row.high.toFixed(3)}] ${verdict}`;
		})
		.join('\n');
}

/** Where a figure was taken. */
export interface Environment {
	readonly commit: string;
	readonly node: string;
	readonly v8: string;
	readonly zlib: string;
	readonly platform: string;
	readonly arch: string;
	readonly cpu: string;
	readonly cpus: number;
	readonly memoryBytes: number;
}

/**
 * Records the machine, the runtime and the commit.
 *
 * @param cwd - A directory in the repository, for the commit
 * @returns The environment
 */
export function environment(cwd: string): Environment {
	return {
		commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(),
		node: process.versions.node,
		v8: process.versions.v8,
		zlib: process.versions.zlib,
		platform: process.platform,
		arch: process.arch,
		cpu: cpus()[0]?.model ?? 'unknown',
		cpus: cpus().length,
		memoryBytes: totalmem(),
	};
}

/**
 * Picks documents of the validator's corpus, evenly spaced through the sorted list so that the
 * choice does not depend on the order of the file system, and small enough that the time is the
 * start of a lint and not one large page.
 *
 * @param root - The directory of the submodule
 * @param count - How many to take
 * @param maxBytes - Documents larger than this are skipped
 * @returns Absolute paths
 */
export function pickValidatorFiles(root: string, count: number, maxBytes = 20_000): string[] {
	const all: string[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((a, b) =>
			compareText(a.name, b.name),
		)) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				walk(path);
			} else if (entry.name.endsWith('.html') && statSync(path).size <= maxBytes) {
				all.push(path);
			}
		}
	};
	for (const directory of ['tests/html', 'tests/html-aria', 'tests/html-svg']) {
		if (!existsSync(join(root, directory))) {
			throw new Error(
				`There is no ${join(root, directory)}: git submodule update --init tests/external/validator`,
			);
		}
		walk(join(root, directory));
	}
	all.sort((a, b) => compareText(relative(root, a), relative(root, b)));
	if (all.length <= count) {
		return all;
	}
	return Array.from({ length: count }, (_, index) => all[Math.floor((index * all.length) / count)] ?? '');
}

/** How many times a pass of a lint scenario is run in a process. */
export const LINT_ITERATIONS = 3;

/** The large documents of the lint scenario that generates them. */
export const LINT_GENERATED = { count: 3, elements: 2000, depth: 30 } as const;

/**
 * The scenarios that the Rust program runs (`crates/markuplint-types/examples/spec_baseline.rs`), by the name that a
 * plan gives them. The program's own name for each is the part after `rust-`.
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

/**
 * Runs one scenario of the Rust program in a new process, as {@link runChild} does for the TypeScript ones.
 *
 * @param scenario - One of {@link RUST_SCENARIOS}
 * @param rust - The program and its inputs
 * @param iterations - How many iterations of the series
 * @returns What it measured
 */
export function runRustChild(scenario: string, rust: RustPlan, iterations: number): Measurement[] {
	const { file, args } = rustCommand(scenario, rust, iterations);
	const output = execFileSync(file, args, {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'inherit'],
	});
	return parseChildOutput(output);
}

/**
 * Finds the Rust program that a `--release` build of the workspace made.
 *
 * @param root - The root of the repository
 * @returns The path of the program
 */
export function rustBinary(root: string): string {
	const binary = join(
		root,
		'crates/target/release/examples',
		process.platform === 'win32' ? 'spec_baseline.exe' : 'spec_baseline',
	);
	if (!existsSync(binary)) {
		throw new Error(
			`There is no ${binary}. Build it from crates/ with: cargo build --locked --release --workspace --example spec_baseline`,
		);
	}
	return binary;
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

/** What {@link runPerf} runs. */
export interface PerfPlan {
	readonly scenarios: Readonly<Record<string, { readonly processes: number; readonly options: ChildOptions }>>;
	readonly seed: number;
	/** The Rust program, for the scenarios that {@link isRustScenario} says are its. */
	readonly rust?: RustPlan;
}

/**
 * Runs the plan: the processes of the scenarios in an interleaved order.
 *
 * @param plan - What to run
 * @param onRun - Called before each process, for progress
 * @returns The series of each name
 */
export function runPerf(plan: PerfPlan, onRun?: (scenario: string, index: number, total: number) => void): Result {
	const counts = Object.fromEntries(Object.entries(plan.scenarios).map(([name, { processes }]) => [name, processes]));
	if (!plan.rust && Object.keys(counts).some(name => isRustScenario(name))) {
		throw new Error('A scenario of the Rust program needs the program: run it with --rust');
	}
	const order = interleave(counts, plan.seed);
	const outputs: Measurement[][] = [];
	for (const [index, name] of order.entries()) {
		onRun?.(name, index, order.length);
		const scenario = plan.scenarios[name];
		if (scenario) {
			outputs.push(
				plan.rust && isRustScenario(name)
					? runRustChild(name, plan.rust, scenario.options.iterations)
					: runChild(name, scenario.options),
			);
		}
	}
	return collect(outputs);
}
