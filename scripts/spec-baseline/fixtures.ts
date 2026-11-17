/**
 * Where the inputs of the diagnostic records are, and which of them are linted with an extended spec.
 *
 * This is the one place that says it: the spec that holds the records and the mutation analysis read the same
 * inputs and must apply the extended spec to the same ones, or a mutation would be run against a record that was
 * taken in other conditions.
 *
 * @module
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The directory of the fixtures. */
export const FIXTURES = fileURLToPath(new URL('fixtures', import.meta.url));

/** The directory of the inputs, which are HTML documents. */
export const INPUTS = join(FIXTURES, 'inputs');

/** The directory of the expected records. */
export const EXPECTED = join(FIXTURES, 'expected');

/** The extended spec that some of the inputs are linted with. */
export const EXTENDED_SPEC = join(FIXTURES, 'extended-spec.json');

/** The names of the inputs (without `.html`) that are linted with {@link EXTENDED_SPEC}. */
export const EXTENDED_INPUTS: ReadonlySet<string> = new Set(['extended-content-model']);

/** An input of the records. */
export interface FixtureInput {
	/** The file name without `.html`. */
	readonly name: string;
	readonly html: string;
	/** The path of the extended spec to lint it with, for an input that has one. */
	readonly extendedSpec?: string;
}

/**
 * Reads the inputs.
 *
 * @returns Every `.html` file of the inputs, sorted by name
 */
export function readInputs(): FixtureInput[] {
	return readdirSync(INPUTS)
		.filter(file => file.endsWith('.html'))
		.toSorted(compareText)
		.map(file => {
			const name = file.replace(/\.html$/, '');
			return {
				name,
				html: readFileSync(join(INPUTS, file), 'utf8'),
				extendedSpec: EXTENDED_INPUTS.has(name) ? EXTENDED_SPEC : undefined,
			};
		});
}

/**
 * Orders text by its code units, which no locale or ICU version changes: a record or a sample of files that depends
 * on the order has to be the same on every machine (`localeCompare` is not).
 *
 * @param a - The first text
 * @param b - The second text
 * @returns A negative number, zero or a positive number
 */
export function compareText(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
