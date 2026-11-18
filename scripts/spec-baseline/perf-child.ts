/**
 * One process of a timing: `node --expose-gc --experimental-strip-types perf-child.ts <scenario> <options as JSON>`.
 *
 * A fresh process is what makes a measurement of a cold start mean something, so the parent
 * (`perf.ts`) starts one for each sample, and this file runs one scenario in it and prints the
 * result as the last line of its output. `--expose-gc` is for the memory figures: a collection
 * before a reading leaves what the data retains, and not what is waiting to be freed.
 *
 * The first iteration of a series is kept apart by the parent: it is what a process that lints a
 * file once pays, and the later ones are what a long-lived process (the language server) pays.
 *
 * What each scenario measures, and why it is what it is:
 *
 * - `load`: the steps between a process start and a spec that a document can use. `html-spec` is
 *   imported the way `resolveSpecs` does, and merged with `schemaToSpec` the way a document does,
 *   and the heap that remains after each step is the memory that the data costs.
 * - `query`: the questions of `layout.ts`, answered through the code of the packages that is
 *   used today, through the plain objects, and through the bits. The three must agree on every
 *   question before any time is taken: a faster answer that differs is not a measurement.
 * - `file`: the cost of reading the data from a file, as it is, compressed, and as bytes
 *   that are only viewed as 32-bit words and never parsed. The last is a floor: no format of that
 *   size can be read faster, and the gap to the first is what a format may recover.
 * - `lint-validator` and `lint-generated`: end to end, through `MLEngine` of `markuplint` with one
 *   `ConfigProvider` for a pass, as the command does, over many small documents and over a few large ones.
 *
 * @module
 */
import type { Measurement } from './perf.ts';

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

import { isCliEntry } from '../spec-citations/entry.ts';
import { generateDocument } from './generate.ts';
import { FLAG_NAMES, askBits, askObject, assertQuestions, buildLayout, questionsOf } from './layout.ts';
import { LINT_GENERATED } from './perf.ts';
import { compressors } from './size.ts';

// Deno's import.meta.resolve cannot resolve this package subpath in the Node-compatible test run.
const require = createRequire(import.meta.url);

/** What the parent passes to a scenario. */
export interface ChildOptions {
	/** How many iterations of the series. */
	readonly iterations: number;
	/** Absolute paths of the documents of `lint-validator`. */
	readonly files?: readonly string[];
	/** The documents of `lint-generated`. */
	readonly generated?: {
		readonly seed: number;
		readonly count: number;
		readonly elements: number;
		readonly depth: number;
	};
}

const gc = (globalThis as { gc?: () => void }).gc;

function collectGarbage(): void {
	if (!gc) {
		throw new Error('Run with --expose-gc: the memory figures need a collection before each reading');
	}
	gc();
	gc();
}

function heapUsed(): number {
	collectGarbage();
	return process.memoryUsage().heapUsed;
}

/** Values that are read so that no step of the timed code can be left out as dead. */
const sink: number[] = [];
(globalThis as { __sink?: number[] }).__sink = sink;

async function loadSpecs() {
	const [{ schemaToSpec, getSpecByTagName, contentModelCategoryToTagNames }, specModule] = await Promise.all([
		import('@markuplint/ml-spec'),
		import('@markuplint/html-spec'),
	]);
	return { schemaToSpec, getSpecByTagName, contentModelCategoryToTagNames, spec: specModule.default };
}

async function load(options: ChildOptions): Promise<Measurement[]> {
	// Everything that is not the data is loaded first, so that its cost is not charged to the data.
	const { schemaToSpec } = await import('@markuplint/ml-spec');
	const before = heapUsed();

	const importStart = performance.now();
	const specModule = await import('@markuplint/html-spec');
	const spec = specModule.default;
	const importMs = performance.now() - importStart;
	const afterImport = heapUsed() - before;

	const merge: number[] = [];
	let merged: unknown;
	for (let i = 0; i < options.iterations; i++) {
		const start = performance.now();
		merged = schemaToSpec([spec as never]);
		merge.push(performance.now() - start);
	}
	sink.push(Object.keys(merged as object).length);
	const afterMerge = heapUsed() - before;

	return [
		{ name: 'load-import', unit: 'ms', values: [importMs] },
		{ name: 'load-merge', unit: 'ms', values: merge },
		{ name: 'heap-after-import', unit: 'bytes', values: [afterImport] },
		{ name: 'heap-after-merge', unit: 'bytes', values: [afterMerge] },
		// `maxRSS` is in kilobytes
		{ name: 'max-rss', unit: 'bytes', values: [process.resourceUsage().maxRSS * 1024] },
	];
}

async function query(options: ChildOptions): Promise<Measurement[]> {
	const { schemaToSpec, getSpecByTagName, contentModelCategoryToTagNames, spec } = await loadSpecs();
	const merged = schemaToSpec([spec as never]);
	const layout = buildLayout(spec as never);
	const questions = questionsOf(layout);
	assertQuestions(layout, questions);

	const today = (): Uint8Array => {
		const answers = new Uint8Array(questions.length);
		for (let i = 0; i < questions.length; i++) {
			const question = questions[i];
			if (!question) {
				continue;
			}
			const name = layout.elements[question.element] ?? '';
			if (question.kind === 'flag') {
				const element = getSpecByTagName(merged.specs, name, null) as Record<string, unknown> | null;
				answers[i] = element?.[FLAG_NAMES[question.flag] ?? ''] === true ? 1 : 0;
			} else {
				const category = layout.categories[question.category] ?? '';
				answers[i] = contentModelCategoryToTagNames(category as never, merged.def).includes(name) ? 1 : 0;
			}
		}
		return answers;
	};
	const object = (): Uint8Array => askObject(spec as never, layout, questions);
	const bits = (): Uint8Array => askBits(layout, questions);

	// What is timed is only worth anything if the three give the same answers.
	const expected = object();
	for (const [name, ask] of [
		['today', today],
		['bits', bits],
	] as const) {
		const got = ask();
		const at = got.findIndex((answer, index) => answer !== expected[index]);
		if (at !== -1) {
			throw new Error(`The ${name} way answers differently at question ${at}: ${JSON.stringify(questions[at])}`);
		}
	}

	const series: Record<'today' | 'object' | 'bits', number[]> = { today: [], object: [], bits: [] };
	const ways = { today, object, bits } as const;
	for (let i = 0; i < options.iterations; i++) {
		for (const name of ['today', 'object', 'bits'] as const) {
			const start = performance.now();
			const answers = ways[name]();
			series[name].push(performance.now() - start);
			sink.push(answers[i % answers.length] ?? 0);
		}
	}
	return (['today', 'object', 'bits'] as const).map(name => ({
		name: `query-${name}`,
		unit: 'ms',
		values: series[name],
	}));
}

function file(options: ChildOptions): Measurement[] {
	const source = readFileSync(require.resolve('@markuplint/html-spec/json'));
	const minified = Buffer.from(JSON.stringify(JSON.parse(source.toString('utf8'))));
	const directory = mkdtempSync(join(tmpdir(), 'spec-baseline-'));
	try {
		const json = join(directory, 'spec.json');
		const brotli = join(directory, 'spec.json.br');
		const raw = join(directory, 'spec.bin');
		writeFileSync(json, minified);
		writeFileSync(brotli, compressors.brotli(minified));
		// Words that are only viewed, never parsed: the floor for a binary of the size of the JSON.
		writeFileSync(raw, Buffer.alloc(minified.length - (minified.length % 4), 1));

		const series = { json: [] as number[], brotli: [] as number[], view: [] as number[] };
		for (let i = 0; i < options.iterations; i++) {
			let start = performance.now();
			const parsed = JSON.parse(readFileSync(json, 'utf8')) as { specs: unknown[] };
			series.json.push(performance.now() - start);
			sink.push(parsed.specs.length);

			start = performance.now();
			const inflated = JSON.parse(brotliDecompressSync(readFileSync(brotli)).toString('utf8')) as {
				specs: unknown[];
			};
			series.brotli.push(performance.now() - start);
			sink.push(inflated.specs.length);

			start = performance.now();
			const bytes = readFileSync(raw);
			const view = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length >>> 2);
			series.view.push(performance.now() - start);
			sink.push(view.at(-1) ?? 0);
		}
		return [
			{ name: 'file-json-read-parse', unit: 'ms', values: series.json },
			{ name: 'file-brotli-inflate-parse', unit: 'ms', values: series.brotli },
			{ name: 'file-read-view', unit: 'ms', values: series.view },
		];
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

async function lintPasses(
	name: string,
	targets: readonly { readonly sourceCode: string; readonly name: string }[],
	iterations: number,
): Promise<Measurement[]> {
	const [{ MLEngine }, { ConfigProvider }] = await Promise.all([
		import('markuplint'),
		import('@markuplint/file-resolver'),
	]);
	const passes: number[] = [];
	for (let i = 0; i < iterations; i++) {
		// One provider for the pass, as the command has for a run: the configuration is resolved once.
		const configProvider = new ConfigProvider();
		const start = performance.now();
		let violations = 0;
		for (const target of targets) {
			const engine = await MLEngine.fromCode(target.sourceCode, {
				name: target.name,
				config: { extends: ['markuplint:recommended'] },
				locale: 'en',
				ignoreExt: true,
				importPresetRules: true,
				configProvider,
			});
			const result = await engine.exec();
			violations += result?.violations.length ?? 0;
		}
		passes.push(performance.now() - start);
		sink.push(violations);
	}
	return [{ name, unit: 'ms', values: passes }];
}

function lintValidator(options: ChildOptions): Promise<Measurement[]> {
	const targets = (options.files ?? []).map(path => ({
		sourceCode: readFileSync(path, 'utf8'),
		name: basename(path),
	}));
	return lintPasses('lint-validator-pass', targets, options.iterations);
}

async function lintGenerated(options: ChildOptions): Promise<Measurement[]> {
	const { spec } = await loadSpecs();
	const { seed, count, elements, depth } = options.generated ?? { ...LINT_GENERATED, seed: 1 };
	const targets = Array.from({ length: count }, (_, index) => ({
		sourceCode: generateDocument(spec as never, { seed: seed + index, elements, depth }),
		name: `generated-${index}.html`,
	}));
	return lintPasses('lint-generated-pass', targets, options.iterations);
}

/** The scenarios by name. */
export const scenarios: Readonly<Record<string, (options: ChildOptions) => Measurement[] | Promise<Measurement[]>>> = {
	load,
	query,
	file,
	'lint-validator': lintValidator,
	'lint-generated': lintGenerated,
};

if (isCliEntry(import.meta.url)) {
	const [name = '', json = '{}'] = process.argv.slice(2);
	const scenario = scenarios[name];
	if (!scenario) {
		throw new Error(`Unknown scenario "${name}". It is one of: ${Object.keys(scenarios).join(', ')}`);
	}
	const measurements = await scenario(JSON.parse(json) as ChildOptions);
	process.stdout.write(`\n${JSON.stringify({ measurements })}\n`);
}
