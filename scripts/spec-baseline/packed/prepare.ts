/**
 * Writes what the Rust program reads (`crates/markuplint-types/examples/packed_candidates/`), into a directory:
 *
 * - `index.min.json`: the spec as the TypeScript side hands it over, as JSON without white space;
 * - `questions.json`: the questions of `questions.ts` and the answers of the data (a `QuestionsFile`);
 * - `extensions.json`: the extended specs by name (`extensions.ts`);
 * - `<variant>.bin` for each candidate (the name of a candidate with `/` made `-`: `rows-sorted-murmur3`): the packed spec that
 *   this side encodes, which the Rust encoder has to make again byte for byte;
 * - `<variant>.<extension>.bin`: that spec composed with the extension, which the Rust composition has to make again
 *   byte for byte.
 *
 * Run directly, it takes the directory: `node --experimental-strip-types scripts/spec-baseline/packed/prepare.ts <dir>`.
 *
 * @module
 */
import type { SpecLike } from './encode.ts';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCliEntry } from '../../spec-citations/entry.ts';
import { generateDocument } from '../generate.ts';
import { pickValidatorFiles } from '../perf.ts';
import { compose } from './compose.ts';
import { elementsOf } from './documents.ts';
import { encodeSpec } from './encode.ts';
import { EXTENSIONS } from './extensions.ts';
import { VARIANTS, variantName, type Variant } from './format.ts';
import { makeQuestions } from './questions.ts';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SPEC_PATH = 'packages/@markuplint/html-spec/index.json';

/**
 * The name of a candidate in a file name.
 *
 * @param variant - The candidate
 * @returns For example `rows-sorted-murmur3`
 */
export function stemOf(variant: Variant): string {
	return variantName(variant).replaceAll('/', '-');
}

const bytesOf = (words: Uint32Array): Buffer => Buffer.from(words.buffer, words.byteOffset, words.byteLength);

/** What {@link writeInputs} takes. */
export interface InputOptions {
	/** How many documents of the validator the stream is made from. */
	readonly documents?: number;
	/** The documents to make the stream from, in place of those of the validator (a test has no submodule). */
	readonly files?: readonly string[];
	/** The limit of operations of the stream. */
	readonly streamLimit?: number;
}

/**
 * Writes the inputs of the Rust program.
 *
 * @param root - The root of the repository
 * @param directory - Where to write them
 * @param options - How many documents, and how long a stream
 * @returns The candidates and the extensions that were written
 */
export function writeInputs(
	root: string,
	directory: string,
	options: InputOptions = {},
): { variants: readonly string[]; extensions: readonly string[] } {
	mkdirSync(directory, { recursive: true });
	const spec = JSON.parse(readFileSync(join(root, SPEC_PATH), 'utf8')) as SpecLike;
	writeFileSync(join(directory, 'index.min.json'), JSON.stringify(spec));

	const files = options.files ?? pickValidatorFiles(join(root, 'tests/external/validator'), options.documents ?? 30);
	const documents = [
		...files.map(path => elementsOf(readFileSync(path, 'utf8'))),
		elementsOf(generateDocument(spec as never, { seed: 1, elements: 500, depth: 20 })),
	];
	const questions = makeQuestions(spec, documents, { streamLimit: options.streamLimit });
	writeFileSync(join(directory, 'questions.json'), JSON.stringify(questions));
	writeFileSync(join(directory, 'extensions.json'), JSON.stringify(EXTENSIONS));

	for (const variant of VARIANTS) {
		const base = encodeSpec(spec, variant);
		writeFileSync(join(directory, `${stemOf(variant)}.bin`), bytesOf(base.serialize()));
		for (const [name, extension] of Object.entries(EXTENSIONS)) {
			writeFileSync(
				join(directory, `${stemOf(variant)}.${name}.bin`),
				bytesOf(compose(base, [extension]).serialize()),
			);
		}
	}
	return { variants: VARIANTS.map(variant => stemOf(variant)), extensions: Object.keys(EXTENSIONS) };
}

if (isCliEntry(import.meta.url)) {
	const [directory] = process.argv.slice(2);
	if (!directory) {
		throw new Error('Usage: node --experimental-strip-types scripts/spec-baseline/packed/prepare.ts <directory>');
	}
	const written = writeInputs(ROOT, directory);
	process.stdout.write(
		`${written.variants.length} candidates and ${written.extensions.length} extensions in ${directory}\n`,
	);
}
