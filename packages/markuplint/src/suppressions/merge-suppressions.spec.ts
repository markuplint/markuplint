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

describe('mergeSuppressions: scope', () => {
	it('keeps the scope of an incoming entry', () => {
		const incoming = { 'a.html': { 'rule-a': { count: 2, scope: '#a' } } };
		expect(mergeSuppressions({}, incoming)).toStrictEqual(incoming);
	});

	it('keeps the scope of an existing entry the incoming data does not have', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2, scope: '#a' } } };
		expect(mergeSuppressions(existing, {})).toStrictEqual(existing);
	});

	it('keeps the scope of an existing entry when only another rule of the file comes in', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-b': { count: 1, scope: '#b' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': {
				'rule-a': { count: 2, scope: '#a' },
				'rule-b': { count: 1, scope: '#b' },
			},
		});
	});

	it('keeps an equal scope on both sides', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-a': { count: 2, scope: '#a' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 2, scope: '#a' } },
		});
	});

	it('takes the maximum count when neither side has a scope', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2 } } };
		const incoming = { 'a.html': { 'rule-a': { count: 4 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 4 } },
		});
	});

	it('writes only the count and the scope of an entry', () => {
		const existing = { 'a.html': { 'rule-a': { count: 2, scope: '#a', note: 'x' } } };
		const incoming = { 'a.html': { 'rule-b': { count: 1, scope: '#b', note: 'y' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': {
				'rule-a': { count: 2, scope: '#a' },
				'rule-b': { count: 1, scope: '#b' },
			},
		});
	});

	it('keeps the higher existing count under an equal scope', () => {
		const existing = { 'a.html': { 'rule-a': { count: 5, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-a': { count: 3, scope: '#a' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 5, scope: '#a' } },
		});
	});

	it('takes the incoming entry as it is when the scopes differ, even with a higher existing count', () => {
		// The incoming scope contains every current violation; the existing one may not.
		// The existing count was counted in another scope, so it is no budget for this one.
		const existing = { 'a.html': { 'rule-a': { count: 5, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-a': { count: 3, scope: '#b' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 3, scope: '#b' } },
		});
	});

	it('takes the incoming scope when the incoming count is higher', () => {
		const existing = { 'a.html': { 'rule-a': { count: 1, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-a': { count: 3, scope: '#b' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 3, scope: '#b' } },
		});
	});

	it('drops the existing scope when the incoming entry has none', () => {
		// An entry without a scope covers the whole file, which holds the current violations.
		const existing = { 'a.html': { 'rule-a': { count: 5, scope: '#a' } } };
		const incoming = { 'a.html': { 'rule-a': { count: 3 } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 3 } },
		});
	});

	it('takes the incoming entry as it is when the existing entry has no scope', () => {
		const existing = { 'a.html': { 'rule-a': { count: 5 } } };
		const incoming = { 'a.html': { 'rule-a': { count: 3, scope: '#a' } } };
		expect(mergeSuppressions(existing, incoming)).toStrictEqual({
			'a.html': { 'rule-a': { count: 3, scope: '#a' } },
		});
	});
});
