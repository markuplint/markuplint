import { describe, expect, test } from 'vitest';

import { deriveFilenameHint, pLimit, sha256Hex } from './fs-utils.ts';

describe('sha256Hex', () => {
	test('returns the canonical SHA-256 for an empty string', () => {
		expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
	});

	test('matches a known hex digest for a known input', () => {
		expect(sha256Hex('hello world')).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
	});
});

describe('deriveFilenameHint', () => {
	test.each([
		['html/elements/a-novalid.html', 'novalid'],
		['html/elements/a-isvalid.html', 'isvalid'],
		['html/elements/a-haswarn.html', 'haswarn'],
		['html/elements/a-hasinfo.html', 'hasinfo'],
		['html/elements/a.html', 'other'],
		['html/elements/A-NOVALID.html', 'novalid'],
	])('classifies %s as %s', (path, expected) => {
		expect(deriveFilenameHint(path)).toBe(expected);
	});
});

describe('pLimit', () => {
	test('processes every item and preserves index order', async () => {
		const input = [1, 2, 3, 4, 5];
		const result = await pLimit(input, 2, async value => value * 10);
		expect(result).toEqual([10, 20, 30, 40, 50]);
	});

	test('never runs more than the concurrency ceiling', async () => {
		const input = Array.from({ length: 20 }, (_, i) => i);
		let active = 0;
		let peak = 0;
		await pLimit(input, 4, async () => {
			active += 1;
			peak = Math.max(peak, active);
			await new Promise(resolve => setTimeout(resolve, 2));
			active -= 1;
		});
		expect(peak).toBeLessThanOrEqual(4);
	});

	test('handles empty input without deadlocking', async () => {
		const result = await pLimit<number, number>([], 4, async value => value * 2);
		expect(result).toEqual([]);
	});

	test('propagates the first error', async () => {
		await expect(
			pLimit([1, 2, 3], 2, async value => {
				if (value === 2) throw new Error('boom');
				return value;
			}),
		).rejects.toThrow('boom');
	});
});
