import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as zlib from 'node:zlib';
import { describe, expect, test } from 'vitest';

import { encodeSpec, type SpecLike } from './encode.ts';
import { VARIANTS, type Variant } from './format.ts';
import { stemOf } from './prepare.ts';
import { renderSizes, sizesOfDirectory } from './sizes.ts';

const SMALL = JSON.parse(readFileSync(new URL('fixtures/small-spec.json', import.meta.url), 'utf8')) as SpecLike;

const find = (grouped: boolean): Variant => {
	const variant = VARIANTS.find(
		candidate =>
			!candidate.columns &&
			candidate.index === 'pow2' &&
			candidate.hash === 'murmur3' &&
			Boolean(candidate.grouped) === grouped &&
			!candidate.zero &&
			!candidate.narrow &&
			!candidate.bare,
	);
	if (!variant) {
		throw new Error(`no candidate (grouped ${grouped})`);
	}
	return variant;
};

const PLAIN = find(false);
const GROUPED = find(true);

const gzipOf = (bytes: Buffer): number => zlib.gzipSync(bytes, { level: 9 }).length;
const brotliOf = (bytes: Buffer): number =>
	zlib.brotliCompressSync(bytes, {
		params: {
			[zlib.constants.BROTLI_PARAM_QUALITY]: 11,
			[zlib.constants.BROTLI_PARAM_LGWIN]: 24,
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
		},
	}).length;

/** What `prepare.ts` writes of a spec and of two candidates, into a directory of its own. */
function writeDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), 'packed-sizes-spec-'));
	writeFileSync(join(directory, 'index.min.json'), JSON.stringify(SMALL));
	for (const variant of [PLAIN, GROUPED]) {
		const words = encodeSpec(SMALL, variant).serialize();
		writeFileSync(
			join(directory, `${stemOf(variant)}.bin`),
			Buffer.from(words.buffer, words.byteOffset, words.byteLength),
		);
	}
	return directory;
}

describe('sizesOfDirectory', () => {
	test('names a candidate by the stem of its files, in the order that it was given', () => {
		const directory = writeDirectory();
		try {
			expect(sizesOfDirectory(directory, [GROUPED, PLAIN]).candidates.map(size => size.stem)).toStrictEqual([
				stemOf(GROUPED),
				stemOf(PLAIN),
			]);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	test('gives the bytes of the file that the encoder makes, at the strongest gzip and Brotli as size.ts has them', () => {
		const directory = writeDirectory();
		try {
			const measured = sizesOfDirectory(directory, [PLAIN, GROUPED]);
			for (const [position, variant] of [PLAIN, GROUPED].entries()) {
				const words = encodeSpec(SMALL, variant).serialize();
				const bytes = Buffer.from(words.buffer, words.byteOffset, words.byteLength);
				expect(measured.candidates[position]).toStrictEqual({
					stem: stemOf(variant),
					raw: bytes.length,
					gzip: gzipOf(bytes),
					brotli: brotliOf(bytes),
				});
			}
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	test('names the candidate that has no file in the directory', () => {
		const directory = writeDirectory();
		try {
			const other = VARIANTS.find(
				variant => stemOf(variant) !== stemOf(PLAIN) && stemOf(variant) !== stemOf(GROUPED),
			);
			if (!other) {
				throw new Error('no other candidate');
			}
			expect(() => sizesOfDirectory(directory, [other])).toThrow(
				`There is no file of the candidate ${stemOf(other)}`,
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

	test('gives the bytes of the JSON of the spec as the baseline', () => {
		const directory = writeDirectory();
		try {
			const bytes = Buffer.from(JSON.stringify(SMALL));
			expect(sizesOfDirectory(directory, [PLAIN]).baseline).toStrictEqual({
				raw: bytes.length,
				gzip: gzipOf(bytes),
				brotli: brotliOf(bytes),
			});
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe('renderSizes', () => {
	test('is a table with a line for each candidate and the three sizes, which the size of the JSON follows as the baseline', () => {
		const text = renderSizes({
			candidates: [
				{ stem: 'rows-pow2-murmur3', raw: 1000, gzip: 300, brotli: 200 },
				{ stem: 'columns-pow2-murmur3-grouped-zero', raw: 1000, gzip: 250, brotli: 150 },
			],
			baseline: { raw: 5000, gzip: 400, brotli: 300 },
		});
		expect(text.split('\n')).toStrictEqual([
			'candidate                            raw  gzip  brotli',
			'rows-pow2-murmur3                  1,000   300     200',
			'columns-pow2-murmur3-grouped-zero  1,000   250     150',
			'JSON (minified)                    5,000   400     300',
		]);
	});

	test('aligns numbers of different lengths to the right, with a thousands separator', () => {
		const text = renderSizes({
			candidates: [{ stem: 'a', raw: 1_234_567, gzip: 9, brotli: 12_345 }],
			baseline: { raw: 5, gzip: 1000, brotli: 99 },
		});
		expect(text.split('\n')).toStrictEqual([
			'candidate              raw   gzip  brotli',
			'a                1,234,567      9  12,345',
			'JSON (minified)          5  1,000      99',
		]);
	});

	test('is the header and the baseline when there is no candidate', () => {
		const text = renderSizes({ candidates: [], baseline: { raw: 5, gzip: 4, brotli: 3 } });
		expect(text.split('\n')).toStrictEqual([
			'candidate        raw  gzip  brotli',
			'JSON (minified)    5     4       3',
		]);
	});
});
