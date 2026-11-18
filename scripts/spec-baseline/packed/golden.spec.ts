import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { compose } from './compose.ts';
import { encodeSpec } from './encode.ts';
import { VARIANTS } from './format.ts';
import { stemOf } from './prepare.ts';

const read = (name: string): never =>
	JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8')) as never;

/**
 * The checksums of the files that a small spec, and the same composed with a small extension, make for every candidate.
 * The Rust program of the candidates has the same fixtures and the same numbers in its tests, so a change to what either
 * language writes is a failure of both, without the measurement being run.
 */
const GOLDEN = read('golden.json') as Record<string, { base: number; composed: number; bytes: number }>;
const SPEC = read('small-spec.json');
const EXTENSION = read('small-extension.json');

describe.each(VARIANTS)('the files of the small spec (%o)', variant => {
	const stem = stemOf(variant);
	const golden = GOLDEN[stem];

	test(`${stem}: has the checksum and the size that the Rust program also writes`, () => {
		const words = encodeSpec(SPEC, variant).serialize();
		expect(words.at(-1)).toBe(golden?.base);
		expect(words.length * 4).toBe(golden?.bytes);
	});

	test(`${stem}: has the checksum of the composition that the Rust program also writes`, () => {
		const words = compose(encodeSpec(SPEC, variant), [EXTENSION]).serialize();
		expect(words.at(-1)).toBe(golden?.composed);
	});
});
