import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import { pruneSuppressions } from './prune-suppressions.js';

function v(ruleId: string, severity: 'error' | 'warning' | 'info' = 'error'): Violation {
	return { ruleId, severity, message: 'test', line: 1, col: 1, raw: '' };
}

describe('pruneSuppressions', () => {
	const suppressionsPath = '/project/markuplint-suppressions.json';

	it('removes entries with 0 current violations', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', []]]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 3 } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({});
	});

	it('updates count when current < suppressed', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a')]]]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 5 } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': { 'rule-a': { count: 2 } },
		});
	});

	it('keeps count when current >= suppressed', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-a')]],
		]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 2 } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': { 'rule-a': { count: 2 } },
		});
	});

	it('removes file entries when all rules are removed', () => {
		const violations = new Map<string, Violation[]>();
		const existing = {
			'src/a.html': { 'rule-a': { count: 1 } },
			'src/b.html': { 'rule-b': { count: 2 } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({});
	});

	it('handles mixed scenario: some rules removed, some updated, some kept', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-b'), v('rule-c'), v('rule-c'), v('rule-c')]],
		]);
		const existing = {
			'src/a.html': {
				'rule-a': { count: 3 }, // 0 violations → removed
				'rule-b': { count: 5 }, // 1 < 5 → updated to 1
				'rule-c': { count: 2 }, // 3 >= 2 → kept as 2
			},
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-b': { count: 1 },
				'rule-c': { count: 2 },
			},
		});
	});

	it('ignores warning violations in count', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a', 'warning'), v('rule-a', 'warning')]],
		]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 2 } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		// 0 error violations → entry removed
		expect(result).toStrictEqual({});
	});

	it('preserves scope when updating count', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a')]]]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 5, scope: '#main > ul' } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': { 'rule-a': { count: 2, scope: '#main > ul' } },
		});
	});

	it('preserves scope when keeping entry as-is', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-a')]],
		]);
		const existing = {
			'src/a.html': { 'rule-a': { count: 2, scope: 'nav.sidebar' } },
		};

		const result = pruneSuppressions(violations, existing, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': { 'rule-a': { count: 2, scope: 'nav.sidebar' } },
		});
	});
});
