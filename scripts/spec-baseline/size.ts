/**
 * How many bytes the spec data takes, and how that depends on the shape of the data.
 *
 * What is compressed is the minified JSON, never the indented file: the published package carries
 * the file as it is, but a consumer that cares about transfer size serves it minified, and
 * the indentation would only measure the formatter. The compressors are those of `node:zlib` at
 * their strongest setting, and every one is deterministic for one build of zlib, so a figure
 * reproduces on the same Node.js and differs across versions of its zlib. zstd needs a Node.js whose `node:zlib` has it
 * (22.15 and later); it is read when it is first used, so a runtime without it fails only the figure that asks for it.
 *
 * A compact binary format is not assumed to win on size: a compressed JSON text is the baseline
 * that it has to beat, and the figures here are that baseline.
 *
 * @module
 */
import * as zlib from 'node:zlib';

/** What each byte count is, for one revision. `null` where the revision is not JSON. */
export interface Sizes {
	readonly raw: number;
	readonly minified: number | null;
	readonly gzip: number | null;
	readonly brotli: number | null;
	readonly zstd: number | null;
}

/** The compressors, each at its strongest level. */
export const compressors = {
	gzip: (bytes: Buffer): Buffer => zlib.gzipSync(bytes, { level: 9 }),
	brotli: (bytes: Buffer): Buffer =>
		zlib.brotliCompressSync(bytes, {
			params: {
				[zlib.constants.BROTLI_PARAM_QUALITY]: 11,
				[zlib.constants.BROTLI_PARAM_LGWIN]: 24,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
			},
		}),
	zstd: (bytes: Buffer): Buffer =>
		zlib.zstdCompressSync(bytes, {
			params: {
				[zlib.constants.ZSTD_c_compressionLevel]: 19,
			},
		}),
} as const;

/**
 * Reads a JSON document.
 *
 * @param bytes - The bytes of a document
 * @returns The value, or `undefined` when the bytes are not JSON (a byte order mark is not JSON either)
 */
export function parseJson(bytes: Buffer): unknown {
	try {
		return JSON.parse(bytes.toString('utf8')) as unknown;
	} catch {
		// Deliberately guard-less: `JSON.parse` of text throws a `SyntaxError` and nothing else, and what is asked is
		// whether the text is JSON, so no other error can be hidden here.
		return undefined;
	}
}

/**
 * Removes the whitespace between tokens.
 *
 * @param bytes - A JSON document
 * @returns The same data without insignificant whitespace, or `null` when it is not JSON
 */
export function minify(bytes: Buffer): Buffer | null {
	const parsed = parseJson(bytes);
	return parsed === undefined ? null : Buffer.from(JSON.stringify(parsed));
}

/**
 * Measures one revision.
 *
 * @param bytes - The revision exactly as stored
 * @param compress - Whether to compress, which takes seconds for the strongest settings on a large revision
 * @returns The raw size and, when it is JSON, the minified size and each compressed size of the minified text
 */
export function measure(bytes: Buffer, compress = true): Sizes {
	const minified = minify(bytes);
	if (!minified) {
		return { raw: bytes.length, minified: null, gzip: null, brotli: null, zstd: null };
	}
	if (!compress) {
		return { raw: bytes.length, minified: minified.length, gzip: null, brotli: null, zstd: null };
	}
	return {
		raw: bytes.length,
		minified: minified.length,
		gzip: compressors.gzip(minified).length,
		brotli: compressors.brotli(minified).length,
		zstd: compressors.zstd(minified).length,
	};
}

/**
 * Names the shape of a document by the keys it is made of, instead of a label that would have to be kept
 * up to date as the data changes: two revisions with the same signature have the same top-level layout.
 *
 * @param data - A parsed revision
 * @returns The sorted top-level keys and the sorted keys of `def`
 */
export function signature(data: unknown): string {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		return 'not an object';
	}
	const record = data as Record<string, unknown>;
	const top = Object.keys(record).toSorted().join(',');
	const def = record.def;
	const defKeys = typeof def === 'object' && def !== null ? Object.keys(def).toSorted().join(',') : '-';
	return `${top} | def: ${defKeys}`;
}

/** A revision as {@link groupBySignature} reads it. */
export interface Row {
	readonly signature: string;
	readonly date: string;
	readonly minified: number | null;
}

/** The revisions that share a signature. */
export interface Group {
	readonly signature: string;
	readonly count: number;
	readonly newest: string;
	readonly oldest: string;
	readonly minifiedMin: number | null;
	readonly minifiedMax: number | null;
}

/**
 * Groups the revisions by signature.
 *
 * @param rows - The revisions, newest first
 * @returns One group for each signature, in the order of its newest revision
 */
export function groupBySignature(rows: readonly Row[]): Group[] {
	const groups = new Map<string, { count: number; newest: string; oldest: string; sizes: number[] }>();
	for (const row of rows) {
		const group = groups.get(row.signature) ?? { count: 0, newest: row.date, oldest: row.date, sizes: [] };
		group.count++;
		group.oldest = row.date;
		if (row.minified !== null) {
			group.sizes.push(row.minified);
		}
		groups.set(row.signature, group);
	}
	return [...groups].map(([sig, group]) => ({
		signature: sig,
		count: group.count,
		newest: group.newest,
		oldest: group.oldest,
		minifiedMin: group.sizes.length > 0 ? Math.min(...group.sizes) : null,
		minifiedMax: group.sizes.length > 0 ? Math.max(...group.sizes) : null,
	}));
}
