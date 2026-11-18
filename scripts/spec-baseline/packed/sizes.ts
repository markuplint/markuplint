/**
 * The bytes of the files of the candidates, raw and compressed: what an npm tarball (gzip) and a transfer with Brotli carry. The
 * figures are those of the file that the encoder makes, at the strongest levels of `size.ts` (the compressors are deterministic for
 * one build of zlib, so a figure reproduces on the same Node.js), and the minified JSON of the spec is the baseline.
 *
 * @module
 */
import type { Variant } from './format.ts';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compressors } from '../size.ts';
import { VARIANTS } from './format.ts';
import { stemOf } from './prepare.ts';

/** The size of one file. */
export interface FileSize {
	readonly raw: number;
	readonly gzip: number;
	readonly brotli: number;
}

/** The size of the file of a candidate. */
export interface CandidateSize extends FileSize {
	/** The name of the candidate in a file name (`stemOf` of `prepare.ts`). */
	readonly stem: string;
}

/**
 * Measures bytes.
 *
 * @param bytes - The bytes of a file
 * @returns The raw, gzip and Brotli sizes
 */
function sizeOf(bytes: Buffer): FileSize {
	return { raw: bytes.length, gzip: compressors.gzip(bytes).length, brotli: compressors.brotli(bytes).length };
}

/**
 * Measures the files that `prepare.ts` wrote into a directory (`<candidate>.bin`, and the JSON of the spec as `index.min.json`),
 * which are what a measurement was made with, so that they are not made again.
 *
 * @param directory - What `prepare.ts` wrote
 * @param variants - The candidates, in the order of the result
 * @returns One size for each candidate, and the size of the JSON
 */
export function sizesOfDirectory(
	directory: string,
	variants: readonly Variant[] = VARIANTS,
): { candidates: CandidateSize[]; baseline: FileSize } {
	return {
		candidates: variants.map(variant => {
			const stem = stemOf(variant);
			const path = join(directory, `${stem}.bin`);
			if (!existsSync(path)) {
				throw new Error(
					`There is no file of the candidate ${stem} in ${directory}: it was not one of those written`,
				);
			}
			return { stem, ...sizeOf(readFileSync(path)) };
		}),
		baseline: sizeOf(readFileSync(join(directory, 'index.min.json'))),
	};
}

const format = (value: number): string => value.toLocaleString('en-US');

/**
 * Renders the sizes as a table, the baseline last.
 *
 * @param sizes - The candidates, and the minified JSON as the baseline
 * @param sizes.candidates - The candidates
 * @param sizes.baseline - The minified JSON
 * @returns The lines of the table, joined by a line feed
 */
export function renderSizes(sizes: { candidates: readonly CandidateSize[]; baseline: FileSize }): string {
	const { candidates, baseline } = sizes;
	const lines: readonly (readonly string[])[] = [
		['candidate', 'raw', 'gzip', 'brotli'],
		...candidates.map(row => [row.stem, format(row.raw), format(row.gzip), format(row.brotli)]),
		['JSON (minified)', format(baseline.raw), format(baseline.gzip), format(baseline.brotli)],
	];
	const widths = [0, 1, 2, 3].map(column => Math.max(...lines.map(line => (line[column] ?? '').length)));
	return lines
		.map(line =>
			line
				.map((cell, column) =>
					column === 0 ? cell.padEnd(widths[0] ?? 0) : cell.padStart(widths[column] ?? 0),
				)
				.join('  '),
		)
		.join('\n');
}
