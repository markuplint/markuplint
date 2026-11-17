import { brotliDecompressSync, gunzipSync, zstdDecompressSync } from 'node:zlib';

import { describe, expect, test } from 'vitest';

import { compressors, groupBySignature, measure, minify, parseJson, signature } from './size.ts';

describe('parseJson', () => {
	test('gives the value of a JSON document, a value that is `null` included', () => {
		expect(parseJson(Buffer.from('{"a": [1]}'))).toStrictEqual({ a: [1] });
		expect(parseJson(Buffer.from('null'))).toBeNull();
	});

	test('gives undefined for what is not JSON, a byte order mark included', () => {
		expect(parseJson(Buffer.from('{'))).toBeUndefined();
		expect(parseJson(Buffer.from('\uFEFF{"a": 1}'))).toBeUndefined();
	});
});

describe('minify', () => {
	test('drops the whitespace of an indented document and keeps the data', () => {
		const text = JSON.stringify({ a: [1, 2, { b: 'x y' }] }, null, '\t');
		expect(minify(Buffer.from(text))?.toString()).toBe('{"a":[1,2,{"b":"x y"}]}');
	});

	test('keeps non-ASCII text as it is, not as escapes', () => {
		expect(minify(Buffer.from('{"a": "ü"}'))?.toString()).toBe('{"a":"ü"}');
	});

	test('returns null for a document that is not JSON', () => {
		expect(minify(Buffer.from('{"a": '))).toBeNull();
	});
});

describe('compressors', () => {
	const sample = Buffer.from('{"element":"a","attributes":["href","href","href"]}'.repeat(200));

	test('gzip, Brotli and zstd each round-trip the bytes', () => {
		expect(gunzipSync(compressors.gzip(sample)).equals(sample)).toBe(true);
		expect(brotliDecompressSync(compressors.brotli(sample)).equals(sample)).toBe(true);
		expect(zstdDecompressSync(compressors.zstd(sample)).equals(sample)).toBe(true);
	});

	test('compress a repetitive document to a small fraction of its size', () => {
		for (const compress of Object.values(compressors)) {
			expect(compress(sample).length).toBeLessThan(sample.length / 10);
		}
	});

	test('give the same bytes for the same input', () => {
		for (const compress of Object.values(compressors)) {
			expect(compress(sample).equals(compress(sample))).toBe(true);
		}
	});
});

describe('measure', () => {
	test('reports the raw size, the minified size and each compressed size of the minified text', () => {
		const text = JSON.stringify({ list: Array.from({ length: 100 }, () => 'word') }, null, '\t');
		const row = measure(Buffer.from(text));
		expect(row.raw).toBe(Buffer.byteLength(text));
		expect(row.minified).toBe(Buffer.byteLength(JSON.stringify(JSON.parse(text))));
		expect(row.gzip).toBeGreaterThan(0);
		expect(row.gzip).toBeLessThan(row.minified ?? 0);
		expect(row.brotli).toBeLessThan(row.minified ?? 0);
		expect(row.zstd).toBeLessThan(row.minified ?? 0);
	});

	test('leaves the compressed sizes out when it is asked not to compress', () => {
		const row = measure(Buffer.from('{"a": [1, 2]}'), false);
		expect(row).toStrictEqual({ raw: 13, minified: 11, gzip: null, brotli: null, zstd: null });
	});

	test('reports only the raw size for a document that is not JSON', () => {
		expect(measure(Buffer.from('{'))).toStrictEqual({
			raw: 1,
			minified: null,
			gzip: null,
			brotli: null,
			zstd: null,
		});
	});
});

describe('signature', () => {
	test('is the sorted top-level keys with the sorted keys of `def`', () => {
		expect(signature({ specs: [], def: { '#aria': {}, '#globalAttrs': {} } })).toBe(
			'def,specs | def: #aria,#globalAttrs',
		);
	});

	test('marks a document without `def`', () => {
		expect(signature({ nodeRules: [] })).toBe('nodeRules | def: -');
	});

	test('does not depend on the order of the keys', () => {
		expect(signature({ b: 1, a: 2 })).toBe(signature({ a: 2, b: 1 }));
	});

	test('is "not JSON" for something that is not an object', () => {
		expect(signature(null)).toBe('not an object');
		expect(signature([1])).toBe('not an object');
	});
});

describe('groupBySignature', () => {
	test('groups consecutive and separate revisions by signature with the first and last dates', () => {
		const rows = [
			{ signature: 'x', date: '2026-01-03', minified: 30 },
			{ signature: 'y', date: '2025-01-01', minified: 10 },
			{ signature: 'x', date: '2024-01-02', minified: 20 },
		];
		expect(groupBySignature(rows)).toStrictEqual([
			{ signature: 'x', count: 2, newest: '2026-01-03', oldest: '2024-01-02', minifiedMin: 20, minifiedMax: 30 },
			{ signature: 'y', count: 1, newest: '2025-01-01', oldest: '2025-01-01', minifiedMin: 10, minifiedMax: 10 },
		]);
	});

	test('skips the size of a revision that has none when it takes the range', () => {
		const rows = [
			{ signature: 'x', date: '2026-01-03', minified: null },
			{ signature: 'x', date: '2026-01-02', minified: 5 },
		];
		expect(groupBySignature(rows)[0]).toMatchObject({ count: 2, minifiedMin: 5, minifiedMax: 5 });
	});
});
