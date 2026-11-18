/**
 * One process of a timing of the packed candidates:
 * `node --expose-gc --experimental-strip-types child.ts <scenario> <options as JSON>`, which prints the measurements as the
 * last line of its output, as `perf-child.ts` does and for the same reasons (a fresh process for each sample, the first
 * iteration reported apart by the parent). The scenarios of the candidates are in a file of their own because `perf-child.ts`
 * is shared with `dev`, which has no packed candidates.
 *
 * What each scenario measures (the directory is what `prepare.ts` wrote):
 *
 * - `open`: reading the file and opening it (the checksum included), the checksum alone, and the memory that the opened spec
 *   keeps. With `compare: 'decoded'` the strings are made into JavaScript strings when the file is opened.
 * - `query`: the questions of `questions.ts`, answered from the packed spec: the bits, the paths and the stream. The answers must equal those of the data
 *   before any time is taken.
 * - `compose`: composing the packed spec with each extension (`extensions.ts`) which is what `schemaToSpec` does for every document today.
 * - `objects`: the baseline, from the JSON as objects: reading and parsing, the same questions, and `schemaToSpec` for each extension.
 * - `hash`: Murmur3 and xxHash32 over every string of the questions, which is what the index of a lookup pays for the name.
 *
 * @module
 */
import type { Measurement } from '../perf.ts';
import type { ExtensionLike } from './compose.ts';
import type { StringCompare } from './read.ts';
import type { QuestionsFile } from './questions.ts';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { schemaToSpec } from '@markuplint/ml-spec';

import { isCliEntry } from '../../spec-citations/entry.ts';
import { ObjectSpec, askBits, askBitsObjects, askPaths, askPathsObjects, askStream, askStreamObjects } from './ask.ts';
import { compose } from './compose.ts';
import { regionValues, type SpecLike } from './encode.ts';
import { crc32cWords, murmur3, nameBytes, xxhash32 } from './hash.ts';
import { PackedSpec, wordsOf } from './read.ts';

/** What the parent gives a scenario. */
export interface ChildOptions {
	readonly iterations: number;
	readonly dir: string;
	/** The candidate, as in the names of the files of `prepare.ts`. */
	readonly stem?: string;
	readonly compare?: StringCompare;
}

const gc = (globalThis as { gc?: () => void }).gc;

/**
 * The memory that what a scenario keeps takes, after a collection: the heap of V8 and the buffers outside it. The words of a packed
 * file are in a buffer, which `heapUsed` does not count, and the objects of the JSON are in the heap: only the two together are
 * what a reader keeps in either form (the allocator of the Rust program counts both).
 */
function memoryUsed(): number {
	if (!gc) {
		throw new Error('Run with --expose-gc: the memory figures need a collection before each reading');
	}
	gc();
	gc();
	const { heapUsed, arrayBuffers } = process.memoryUsage();
	return heapUsed + arrayBuffers;
}

/** Values that are read so that no step of the timed code can be left out as dead. */
const sink: number[] = [];
(globalThis as { __sink?: number[] }).__sink = sink;

const readQuestions = (dir: string): QuestionsFile =>
	JSON.parse(readFileSync(join(dir, 'questions.json'), 'utf8')) as QuestionsFile;

const readExtensions = (dir: string): Record<string, ExtensionLike> =>
	JSON.parse(readFileSync(join(dir, 'extensions.json'), 'utf8')) as Record<string, ExtensionLike>;

function stemOf(options: ChildOptions): string {
	if (!options.stem) {
		throw new Error('This scenario needs the candidate (stem)');
	}
	return options.stem;
}

function openFile(options: ChildOptions): PackedSpec {
	const bytes = readFileSync(join(options.dir, `${stemOf(options)}.bin`));
	return PackedSpec.open(wordsOf(bytes), { compare: options.compare ?? 'bytes' });
}

/** The name that a figure has: the language, the candidate and how strings are compared, and what it is. */
function name(options: ChildOptions, metric: string): string {
	return `ts:${stemOf(options)}:${options.compare ?? 'bytes'}:${metric}`;
}

function time(iterations: number, work: () => number): number[] {
	const times: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		const result = work();
		times.push(performance.now() - start);
		sink.push(result);
	}
	return times;
}

function open(options: ChildOptions): Measurement[] {
	const path = join(options.dir, `${stemOf(options)}.bin`);
	const compare = options.compare ?? 'bytes';
	const before = memoryUsed();
	const kept = PackedSpec.open(wordsOf(readFileSync(path)), { compare });
	const heap = memoryUsed() - before;
	sink.push(kept.stringCount);

	const opening = time(
		options.iterations,
		() => PackedSpec.open(wordsOf(readFileSync(path)), { compare }).stringCount,
	);
	const words = wordsOf(readFileSync(path));
	const checksum = time(options.iterations, () => crc32cWords(words, words.length - 1));
	return [
		{ name: name(options, 'open'), unit: 'ms', values: opening },
		{ name: name(options, 'crc'), unit: 'ms', values: checksum },
		{ name: name(options, 'heap-after-open'), unit: 'bytes', values: [heap] },
	];
}

/** Stops when the answers are not the ones that the data gives: a time of a wrong answer is not a measurement. */
function assertSame(what: string, got: ArrayLike<number>, expected: readonly number[]): void {
	if (got.length !== expected.length) {
		throw new Error(`${what}: ${got.length} answers for ${expected.length} questions`);
	}
	for (let i = 0; i < expected.length; i++) {
		if (got[i] !== expected[i]) {
			throw new Error(`${what} answers differently at question ${i}: ${got[i]}, the data says ${expected[i]}`);
		}
	}
}

function query(options: ChildOptions): Measurement[] {
	const questions = readQuestions(options.dir);
	const spec = openFile(options);
	assertSame('bits', askBits(spec, questions), questions.bitAnswers);
	assertSame('paths', askPaths(spec, questions), questions.pathAnswers);
	assertSame('stream', askStream(spec, questions), questions.streamAnswers);
	return [
		{
			name: name(options, 'bits'),
			unit: 'ms',
			values: time(options.iterations, () => askBits(spec, questions)[3] ?? 0),
		},
		{
			name: name(options, 'paths'),
			unit: 'ms',
			values: time(options.iterations, () => askPaths(spec, questions)[3] ?? 0),
		},
		{
			name: name(options, 'stream'),
			unit: 'ms',
			values: time(options.iterations, () => askStream(spec, questions)[3] ?? 0),
		},
	];
}

function composition(options: ChildOptions): Measurement[] {
	const extensions = readExtensions(options.dir);
	// A spec that is opened for each extension, as the Rust program does: what a composition keeps for a spec (the table of
	// its strings, the indexes of its regions) is not warm for the extension that comes after another.
	return Object.entries(extensions).map(([extension, value]) => {
		const base = openFile(options);
		return {
			name: name(options, `compose-${extension}`),
			unit: 'ms' as const,
			values: time(options.iterations, () => compose(base, [value]).stringCount),
		};
	});
}

function objects(options: ChildOptions): Measurement[] {
	const questions = readQuestions(options.dir);
	const extensions = readExtensions(options.dir);
	const path = join(options.dir, 'index.min.json');
	const spec = JSON.parse(readFileSync(path, 'utf8')) as SpecLike;
	const view = new ObjectSpec(regionValues(spec));
	assertSame('bits', askBitsObjects(view, questions), questions.bitAnswers);
	assertSame('paths', askPathsObjects(view, questions), questions.pathAnswers);
	assertSame('stream', askStreamObjects(view, questions), questions.streamAnswers);

	const before = memoryUsed();
	const kept = JSON.parse(readFileSync(path, 'utf8')) as { specs: unknown[] };
	const heap = memoryUsed() - before;
	sink.push(kept.specs.length);

	return [
		{
			name: 'objects:load',
			unit: 'ms',
			values: time(
				options.iterations,
				() => (JSON.parse(readFileSync(path, 'utf8')) as { specs: unknown[] }).specs.length,
			),
		},
		{ name: 'objects:heap-after-load', unit: 'bytes', values: [heap] },
		{
			name: 'objects:bits',
			unit: 'ms',
			values: time(options.iterations, () => askBitsObjects(view, questions)[3] ?? 0),
		},
		{
			name: 'objects:paths',
			unit: 'ms',
			values: time(options.iterations, () => askPathsObjects(view, questions)[3] ?? 0),
		},
		{
			name: 'objects:stream',
			unit: 'ms',
			values: time(options.iterations, () => askStreamObjects(view, questions)[3] ?? 0),
		},
		...Object.entries(extensions).map(([extension, value]) => ({
			name: `objects:compose-${extension}`,
			unit: 'ms' as const,
			values: time(options.iterations, () => Object.keys(schemaToSpec([spec as never, value as never])).length),
		})),
	];
}

function hashes(options: ChildOptions): Measurement[] {
	const { strings } = readQuestions(options.dir);
	const run = (hash: (bytes: Uint8Array, seed: number) => number) => () => {
		let total = 0;
		for (const text of strings) {
			total = (total + hash(nameBytes(text), 0)) >>> 0;
		}
		return total;
	};
	return [
		{ name: 'hash:murmur3', unit: 'ms', values: time(options.iterations, run(murmur3)) },
		{ name: 'hash:xxhash32', unit: 'ms', values: time(options.iterations, run(xxhash32)) },
	];
}

/** The scenarios by name. */
export const scenarios: Readonly<Record<string, (options: ChildOptions) => Measurement[]>> = {
	open,
	query,
	compose: composition,
	objects,
	hash: hashes,
};

if (isCliEntry(import.meta.url)) {
	const [scenarioName = '', json = '{}'] = process.argv.slice(2);
	const scenario = scenarios[scenarioName];
	if (!scenario) {
		throw new Error(`Unknown scenario "${scenarioName}". It is one of: ${Object.keys(scenarios).join(', ')}`);
	}
	const measurements = scenario(JSON.parse(json) as ChildOptions);
	process.stdout.write(`\n${JSON.stringify({ measurements })}\n`);
}
