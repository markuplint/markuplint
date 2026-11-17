import { describe, expect, test } from 'vitest';

import { bootstrapCI, mean, mulberry32, percentile, ratioCI } from './stats.ts';

describe('mean', () => {
	test('is the sum over the number', () => {
		expect(mean([1, 2, 3, 6])).toBe(3);
	});

	test('throws for an empty list rather than returning NaN', () => {
		expect(() => mean([])).toThrow();
	});
});

describe('percentile', () => {
	test('is the median at one half, for an odd and an even list', () => {
		expect(percentile([3, 1, 2], 0.5)).toBe(2);
		expect(percentile([4, 1, 3, 2], 0.5)).toBe(2.5);
	});

	test('throws for an empty list and for a fraction outside 0 to 1', () => {
		expect(() => percentile([], 0.5)).toThrow();
		expect(() => percentile([1], -0.1)).toThrow();
		expect(() => percentile([1], 1.1)).toThrow();
		expect(() => percentile([1], Number.NaN)).toThrow();
	});

	test('interpolates between the neighbours', () => {
		expect(percentile([10, 20, 30, 40], 0)).toBe(10);
		expect(percentile([10, 20, 30, 40], 1)).toBe(40);
		expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
	});
});

describe('mulberry32', () => {
	test('gives the same sequence for the same seed and another for another seed', () => {
		const a = mulberry32(1);
		const b = mulberry32(1);
		const c = mulberry32(2);
		const first = [a(), a(), a()];
		expect([b(), b(), b()]).toStrictEqual(first);
		expect([c(), c(), c()]).not.toStrictEqual(first);
	});

	test('stays in [0, 1)', () => {
		const random = mulberry32(7);
		for (let i = 0; i < 1000; i++) {
			const value = random();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe('bootstrapCI', () => {
	test('is a point for data without any variation', () => {
		const ci = bootstrapCI(
			[
				[5, 5],
				[5, 5, 5],
			],
			{ resamples: 200, seed: 1 },
		);
		expect(ci).toStrictEqual({ mean: 5, low: 5, high: 5 });
	});

	test('contains the mean and is the same for the same seed', () => {
		const data = [
			[10, 12, 11, 13],
			[20, 22, 21, 19],
			[15, 14, 16, 15],
		];
		const a = bootstrapCI(data, { resamples: 1000, seed: 3 });
		const b = bootstrapCI(data, { resamples: 1000, seed: 3 });
		expect(a).toStrictEqual(b);
		expect(a.low).toBeLessThanOrEqual(a.mean);
		expect(a.high).toBeGreaterThanOrEqual(a.mean);
		expect(a.high).toBeGreaterThan(a.low);
	});

	test('is wider for data with more spread between processes', () => {
		const tight = bootstrapCI([[10], [10.1], [9.9], [10]], { resamples: 1000, seed: 1 });
		const loose = bootstrapCI([[10], [14], [6], [10]], { resamples: 1000, seed: 1 });
		expect(loose.high - loose.low).toBeGreaterThan(tight.high - tight.low);
	});

	test('takes the mean of the process means, so a process with many iterations does not outweigh the others', () => {
		const ci = bootstrapCI([[0], [10, 10, 10, 10, 10, 10, 10, 10]], { resamples: 10, seed: 1 });
		expect(ci.mean).toBe(5);
	});

	test('throws for data without a process or a process without an iteration', () => {
		expect(() => bootstrapCI([], { resamples: 10, seed: 1 })).toThrow();
		expect(() => bootstrapCI([[]], { resamples: 10, seed: 1 })).toThrow();
	});
});

describe('the options of a bootstrap', () => {
	const data = [[1], [2]];

	test('need a whole number of resamples of 1 or more', () => {
		expect(() => bootstrapCI(data, { resamples: 0, seed: 1 })).toThrow(/resamples/);
		expect(() => bootstrapCI(data, { resamples: 1.5, seed: 1 })).toThrow(/resamples/);
		expect(() => ratioCI(data, data, { resamples: 0, seed: 1 })).toThrow(/resamples/);
	});

	test('need a confidence between 0 and 1', () => {
		expect(() => bootstrapCI(data, { resamples: 10, seed: 1, confidence: 1 })).toThrow(/confidence/);
		expect(() => bootstrapCI(data, { resamples: 10, seed: 1, confidence: 0 })).toThrow(/confidence/);
	});

	test('give a wider interval for a higher confidence', () => {
		const spread = [[10], [14], [6], [10], [12], [8]];
		const narrow = bootstrapCI(spread, { resamples: 2000, seed: 1, confidence: 0.5 });
		const wide = bootstrapCI(spread, { resamples: 2000, seed: 1, confidence: 0.95 });
		expect(wide.high - wide.low).toBeGreaterThan(narrow.high - narrow.low);
	});
});

describe('ratioCI', () => {
	test('is a point at the ratio for data without variation', () => {
		const ci = ratioCI([[10], [10]], [[5], [5]], { resamples: 200, seed: 1 });
		expect(ci).toStrictEqual({ ratio: 2, low: 2, high: 2 });
	});

	test('contains 1 when both sides are the same measurement', () => {
		const data = [
			[10, 11],
			[12, 13],
			[9, 10],
		];
		const ci = ratioCI(data, data, { resamples: 1000, seed: 1 });
		expect(ci.ratio).toBe(1);
		expect(ci.low).toBeLessThanOrEqual(1);
		expect(ci.high).toBeGreaterThanOrEqual(1);
	});

	test('excludes 1 for a clear difference', () => {
		const slow = [
			[20, 21],
			[20, 22],
			[21, 20],
		];
		const fast = [
			[10, 11],
			[10, 10],
			[11, 10],
		];
		const ci = ratioCI(slow, fast, { resamples: 1000, seed: 1 });
		expect(ci.low).toBeGreaterThan(1);
	});
});
