import { describe, it, expect } from 'vitest';

import { mergeSuppressions } from './merge-suppressions.js';

describe('mergeSuppressions', () => {
	it('returns incoming when existing is empty', () => {
		const incoming = { 'a.html': { 'rule-a': { count: 2 } } };
		expect(mergeSuppressions({}, incoming)).toStrictEqual(incoming);
	});

	it('returns existing when incoming is empty', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2 } } };
		expect(mergeSuppressions(existing, {})).toStrictEqual(existing);
	});

	it('takes the maximum count for overlapping entries', () => {
		const existing = { 'a.html': { 'rule-a': { count: 3 } } };
		const incoming = { 'a.html': { 'rule-a': { count: 5 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 5 } },
		});
	});

	it('keeps existing count when it is higher', () => {
		const existing = { 'a.html': { 'rule-a': { count: 5 } } };
		const incoming = { 'a.html': { 'rule-a': { count: 2 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 5 } },
		});
	});

	it('preserves non-overlapping entries from both sides', () => {
		const existing = { 'a.html': { 'rule-a': { count: 1 } } };
		const incoming = { 'b.html': { 'rule-b': { count: 2 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 1 } },
			'b.html': { 'rule-b': { count: 2 } },
		});
	});

	it('merges multiple rules within the same file', () => {
		const existing = { 'a.html': { 'rule-a': { count: 1 } } };
		const incoming = { 'a.html': { 'rule-b': { count: 2 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': {
				'rule-a': { count: 1 },
				'rule-b': { count: 2 },
			},
		});
	});
});
