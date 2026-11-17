/**
 * Measurements for the design of a packed form of the spec data (`yarn spec-baseline`).
 *
 * The data of `@markuplint/html-spec` is read by every lint, and a form of it that is smaller or that
 * can be read without being parsed is worth building only if the measurements say so, on the
 * data that it will carry. This script takes the measurements; it decides nothing and writes no
 * measurement result into the repository: a figure depends on the machine, and the revisions that it reads
 * are in git already.
 *
 * - `size`: the bytes of every revision of the data in the history, raw, minified, and compressed
 *   (`size.ts`), grouped by the shape of the document, because the shape changed more than once.
 * - `duplication`: what repeats in the data, as strings, as fields and as subtrees (`duplication.ts`).
 * - `perf`: the time and memory of reading the data and of linting, one process for each sample
 *   (`perf.ts`, `perf-child.ts`), and `compare` for two such results measured on one machine. `--rust` adds the same
 *   reading and the same questions in the Rust program of `crates/markuplint-types/examples/spec_baseline.rs`, which
 *   exists on the `v6` line only and is built beforehand with `cargo build --locked --release --workspace --example
 *   spec_baseline` (from `crates/`); `--no-lint` leaves the lint scenarios out.
 * - `mutation`: whether the records of `diagnostics.ts` notice a change of the data (`mutation.ts`).
 * - `coverage`: writes the generated inputs into `fixtures/inputs/` (`coverage.ts`). The inputs are committed, so this
 *   overwrites files that are in the repository, and the records of `diagnostics.spec.ts` are written again after it.
 *
 * `size` needs the whole history (a shallow clone stops it), and `perf` needs the submodule of the
 * validator for the many small documents (`git submodule update --init tests/external/validator`).
 *
 * @module
 */
import type { ChildOptions } from './perf-child.ts';
import {
	type Result,
	compareResults,
	environment,
	LINT_GENERATED,
	LINT_ITERATIONS,
	pickValidatorFiles,
	renderComparison,
	renderTable,
	runPerf,
	rustBinary,
	RUST_SCENARIOS,
	rustVersion,
	writeQuestionsFile,
	type RustPlan,
} from './perf.ts';

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { isCliEntry } from '../spec-citations/entry.ts';
import { assertFullHistory, listRevisions, readBlob, systemGit, uniqueByBlob } from './corpus.ts';
import { generateCoverageInputs } from './coverage.ts';
import { dagStats, fieldStats, stringStats } from './duplication.ts';
import { INPUTS, readInputs } from './fixtures.ts';
import type { SpecLike } from './layout.ts';
import { groupBySignature, measure, parseJson, signature } from './size.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SPEC_PATH = 'packages/@markuplint/html-spec/index.json';

const HELP = `Usage: yarn spec-baseline <command> [options]

  size         [--ref <ref>] [--every <n>]
  duplication  [--ref <commit>] [--top <n>]
  perf         [--processes <n>] [--lint-processes <n>] [--iterations <n>] [--files <n>] [--seed <n>] [--out <file>]
               [--rust] [--no-lint]
  compare      <before.json> <after.json> [--resamples <n>] [--seed <n>]
  mutation     [--count <n>] [--seed <n>]
  coverage     (writes scripts/spec-baseline/fixtures/inputs/generated-*.html)
`;

function table(rows: readonly (readonly string[])[]): string {
	const widths = rows[0]?.map((_, column) => Math.max(...rows.map(row => (row[column] ?? '').length))) ?? [];
	return rows
		.map(row =>
			row
				.map((cell, column) => cell.padEnd(widths[column] ?? 0))
				.join('  ')
				.trimEnd(),
		)
		.join('\n');
}

/**
 * Reads an option that is a count. A value that is not an integer, or is less than the least that the option can
 * take, stops the run: a number that went wrong would otherwise change the measurement without a word (`NaN` compresses
 * no revision and lists no field).
 */
function count(name: string, value: string | undefined, least: number): number {
	const number = Number(value);
	if (value === undefined || !Number.isInteger(number) || number < least) {
		throw new Error(`--${name} takes an integer of ${least} or more, not "${value}"`);
	}
	return number;
}

const bytes = (value: number | null) => (value === null ? '-' : value.toLocaleString('en-US'));

function size(args: readonly string[]): string {
	const { values } = parseArgs({
		args: [...args],
		options: { ref: { type: 'string', default: 'HEAD' }, every: { type: 'string', default: '1' } },
	});
	const every = count('every', values.every, 1);
	const git = systemGit(ROOT);
	assertFullHistory(git);
	const revisions = uniqueByBlob(listRevisions(git, values.ref ?? 'HEAD', SPEC_PATH));
	const rows = revisions.map((revision, index) => {
		const data = readBlob(git, revision.blob);
		const parsed = parseJson(data);
		return {
			revision,
			sizes: measure(data, index % every === 0),
			signature: parsed === undefined ? 'not JSON' : signature(parsed),
		};
	});

	const out: string[] = [
		`${revisions.length} distinct contents in ${revisions.reduce((sum, revision) => sum + revision.commits, 0)} commits of ${SPEC_PATH}`,
		`node ${process.versions.node}, zlib ${process.versions.zlib}; compressed sizes are of the minified text, for every ${every === 1 ? 'revision' : `${every}th revision`}`,
		'',
		'by the shape of the document:',
		table([
			['contents', 'newest', 'oldest', 'minified (min..max)', 'signature'],
			...groupBySignature(
				rows.map(row => ({ signature: row.signature, date: row.revision.date, minified: row.sizes.minified })),
			).map(group => [
				String(group.count),
				group.newest.slice(0, 10),
				group.oldest.slice(0, 10),
				`${bytes(group.minifiedMin)}..${bytes(group.minifiedMax)}`,
				group.signature,
			]),
		]),
		'',
		'the newest revisions:',
		table([
			['commit', 'date', 'raw', 'minified', 'gzip', 'brotli', 'zstd'],
			...rows
				.slice(0, 8)
				.map(row => [
					row.revision.commit.slice(0, 9),
					row.revision.date.slice(0, 10),
					bytes(row.sizes.raw),
					bytes(row.sizes.minified),
					bytes(row.sizes.gzip),
					bytes(row.sizes.brotli),
					bytes(row.sizes.zstd),
				]),
		]),
	];
	const broken = rows.filter(row => row.signature === 'not JSON');
	if (broken.length > 0) {
		out.push('', `not JSON (${broken.length}): ${broken.map(row => row.revision.commit.slice(0, 9)).join(', ')}`);
	}
	return out.join('\n');
}

function duplication(args: readonly string[]): string {
	const { values } = parseArgs({
		args: [...args],
		options: { ref: { type: 'string' }, top: { type: 'string', default: '15' } },
	});
	const top = count('top', values.top, 1);
	const text = values.ref
		? readBlob(systemGit(ROOT), `${values.ref}:${SPEC_PATH}`).toString('utf8')
		: readFileSync(join(ROOT, SPEC_PATH), 'utf8');
	const data = JSON.parse(text) as unknown;
	const strings = stringStats(data);
	const dag = dagStats(data, top);
	const total = Buffer.byteLength(JSON.stringify(data));
	return [
		`${values.ref ?? 'the working tree'}: ${total.toLocaleString('en-US')} bytes minified`,
		'',
		'strings:',
		table([
			['', 'occurrences', 'distinct', 'bytes', 'bytes of the distinct'],
			[
				'keys',
				bytes(strings.keys.occurrences),
				bytes(strings.keys.unique),
				bytes(strings.keys.bytes),
				bytes(strings.keys.uniqueBytes),
			],
			[
				'values',
				bytes(strings.values.occurrences),
				bytes(strings.values.unique),
				bytes(strings.values.bytes),
				bytes(strings.values.uniqueBytes),
			],
		]),
		'',
		`the ${top} fields that take the most bytes (entropy is the bits the values need at best, in bytes):`,
		table([
			['field', 'values', 'distinct', 'bytes', 'entropy'],
			...fieldStats(data)
				.slice(0, top)
				.map(field => [
					field.path,
					bytes(field.occurrences),
					bytes(field.unique),
					bytes(field.bytes),
					bytes(Math.ceil(field.entropyBits / 8)),
				]),
		]),
		'',
		`the tree has ${bytes(dag.treeNodes)} nodes and the DAG that shares identical subtrees has ${bytes(dag.dagNodes)}`,
		`the ${top} repeated subtrees that sharing would save the most from (one that is inside another is counted in both):`,
		table([
			['saves', 'copies', 'bytes', 'first at', 'starts with'],
			...dag.repeated.map(item => [
				bytes(item.saving),
				bytes(item.occurrences),
				bytes(item.size),
				item.path || '(root)',
				item.preview.slice(0, 50),
			]),
		]),
	].join('\n');
}

function perf(args: readonly string[]): string {
	const { values } = parseArgs({
		args: [...args],
		options: {
			processes: { type: 'string', default: '20' },
			'lint-processes': { type: 'string', default: '5' },
			iterations: { type: 'string', default: '20' },
			files: { type: 'string', default: '100' },
			seed: { type: 'string', default: '1' },
			out: { type: 'string' },
			rust: { type: 'boolean', default: false },
			'no-lint': { type: 'boolean', default: false },
		},
	});
	const processes = count('processes', values.processes, 1);
	const lintProcesses = count('lint-processes', values['lint-processes'], 1);
	const iterations = count('iterations', values.iterations, 2);
	const seed = count('seed', values.seed, 0);
	const withLint = !values['no-lint'];
	// Checked with `--no-lint` as well: a typo in an option is not left unread because another option is on
	const fileCount = count('files', values.files, 1);
	const files = withLint ? pickValidatorFiles(join(ROOT, 'tests/external/validator'), fileCount) : [];
	if (withLint && files.length === 0) {
		throw new Error('No document of the validator: git submodule update --init tests/external/validator');
	}
	const rust = values.rust ? prepareRust() : undefined;
	try {
		const scenarios: Record<string, { processes: number; options: ChildOptions }> = {
			load: { processes, options: { iterations } },
			query: { processes, options: { iterations } },
			file: { processes, options: { iterations } },
		};
		if (rust) {
			for (const name of RUST_SCENARIOS) {
				scenarios[name] = { processes, options: { iterations } };
			}
		}
		if (withLint) {
			scenarios['lint-validator'] = { processes: lintProcesses, options: { iterations: LINT_ITERATIONS, files } };
			scenarios['lint-generated'] = {
				processes: lintProcesses,
				options: { iterations: LINT_ITERATIONS, generated: { ...LINT_GENERATED, seed } },
			};
		}
		const result = runPerf(
			{
				seed,
				scenarios,
				...(rust ? { rust: rust.plan } : {}),
			},
			(scenario, index, total) => process.stderr.write(`\r${index + 1}/${total} ${scenario}          `),
		);
		process.stderr.write('\n');
		const env = environment(ROOT);
		if (values.out) {
			writeFileSync(values.out, `${JSON.stringify({ environment: env, rustc: rust?.rustc, result })}\n`);
		}
		return [
			`${env.commit.slice(0, 9)} on node ${env.node} (v8 ${env.v8}), ${env.platform} ${env.arch}, ${env.cpus} x ${env.cpu}`,
			...(rust ? [rust.rustc] : []),
			withLint
				? `the lint scenarios read ${files.length} documents of the validator and ${LINT_GENERATED.count} generated ones of about ${LINT_GENERATED.elements} elements`
				: 'the lint scenarios are not run (--no-lint)',
			'',
			renderTable(result, { resamples: 10_000, seed }),
		].join('\n');
	} finally {
		rust?.cleanup();
	}
}

/**
 * Makes what the scenarios of the Rust program need: the program, which is not built here (it is built with the
 * flags that the addon is built with, and a build is not a measurement), and the file of questions, in a directory
 * of its own that is removed after the run.
 */
function prepareRust(): { plan: RustPlan; rustc: string; cleanup: () => void } {
	const binary = rustBinary(ROOT);
	const index = join(ROOT, SPEC_PATH);
	const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-rust-'));
	const questions = join(directory, 'questions.json');
	writeQuestionsFile(JSON.parse(readFileSync(index, 'utf8')) as SpecLike, questions);
	return {
		plan: { binary, index, questions },
		rustc: rustVersion(),
		cleanup: () => rmSync(directory, { recursive: true, force: true }),
	};
}

function compare(args: readonly string[]): string {
	const { values, positionals } = parseArgs({
		args: [...args],
		allowPositionals: true,
		options: { resamples: { type: 'string', default: '10000' }, seed: { type: 'string', default: '1' } },
	});
	const [beforePath, afterPath] = positionals;
	if (!beforePath || !afterPath) {
		throw new Error(HELP);
	}
	const read = (path: string) => (JSON.parse(readFileSync(path, 'utf8')) as { result: Result }).result;
	const rows = compareResults(read(beforePath), read(afterPath), {
		resamples: count('resamples', values.resamples, 1),
		seed: count('seed', values.seed, 0),
	});
	return `the ratio of the mean of ${afterPath} to the mean of ${beforePath}, with a 95% interval\n\n${renderComparison(rows)}`;
}

async function coverage(): Promise<string> {
	const { default: htmlSpec } = await import('@markuplint/html-spec');
	const inputs = generateCoverageInputs(htmlSpec as never);
	const written: string[] = [];
	for (const [name, html] of Object.entries(inputs)) {
		writeFileSync(join(INPUTS, name), html);
		written.push(`${name}  ${Buffer.byteLength(html).toLocaleString('en-US')} bytes`);
	}
	return `wrote:\n${written.join('\n')}`;
}

async function mutation(args: readonly string[]): Promise<string> {
	const { values } = parseArgs({
		args: [...args],
		options: { count: { type: 'string', default: '200' }, seed: { type: 'string', default: '1' } },
	});
	const [{ default: htmlSpec }, { diagnose }, { enumerateMutations, runMutations, sample, summarize }] =
		await Promise.all([import('@markuplint/html-spec'), import('./diagnostics.ts'), import('./mutation.ts')]);
	const inputs = readInputs();
	const all = enumerateMutations(htmlSpec as never);
	const picked = sample(all, count('count', values.count, 1), count('seed', values.seed, 0));
	const outcomes = await runMutations(
		htmlSpec as never,
		picked,
		inputs,
		async (html, options) => JSON.stringify(await diagnose(html, options as never)),
		(done, total) => process.stderr.write(`\r${done}/${total}   `),
	);
	process.stderr.write('\n');
	return `${all.length.toLocaleString('en-US')} mutations of the data; ${picked.length} taken (seed ${values.seed})\n\n${summarize(outcomes)}`;
}

/**
 * Runs a command.
 *
 * @param argv - The command and its options
 * @returns The report to print
 */
export function run(argv: readonly string[]): string | Promise<string> {
	const [command, ...rest] = argv;
	switch (command) {
		case 'size': {
			return size(rest);
		}
		case 'duplication': {
			return duplication(rest);
		}
		case 'perf': {
			return perf(rest);
		}
		case 'compare': {
			return compare(rest);
		}
		case 'mutation': {
			return mutation(rest);
		}
		case 'coverage': {
			return coverage();
		}
		default: {
			return HELP;
		}
	}
}

if (isCliEntry(import.meta.url)) {
	process.stdout.write(`${await run(process.argv.slice(2))}\n`);
}
