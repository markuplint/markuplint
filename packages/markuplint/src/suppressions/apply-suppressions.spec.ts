import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import { applySuppressions } from './apply-suppressions.js';

function v(ruleId: string, severity: 'error' | 'warning' | 'info' = 'error'): Violation {
	return { ruleId, severity, message: 'test', line: 1, col: 1, raw: '' };
}

describe('applySuppressions', () => {
	const suppressionsPath = '/project/markuplint-suppressions.json';

	it('suppresses all errors when count <= suppressed count', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 3 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toStrictEqual([]);
	});

	it('reports ALL violations when count > suppressed count', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-a')]],
		]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 2 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toHaveLength(3);
	});

	it('passes through warning and info violations', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a', 'error'), v('rule-b', 'warning'), v('rule-c', 'info')]],
		]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		const result = filtered.get('/project/src/a.html')!;
		expect(result).toHaveLength(2);
		expect(result[0]!.severity).toBe('warning');
		expect(result[1]!.severity).toBe('info');
	});

	it('passes through violations for files not in suppressions', () => {
		const violations = new Map<string, Violation[]>([['/project/src/unknown.html', [v('rule-a')]]]);

		const { filtered } = applySuppressions(violations, {}, suppressionsPath);
		expect(filtered.get('/project/src/unknown.html')).toHaveLength(1);
	});

	it('passes through violations for rules not in suppressions', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-unknown')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toHaveLength(1);
	});

	it('detects unused suppression entries', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 }, 'rule-b': { count: 2 } },
			'src/deleted.html': { 'rule-c': { count: 1 } },
		};

		const { unusedEntries } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(unusedEntries).toContain('src/a.html:rule-b');
		expect(unusedEntries).toContain('src/deleted.html:rule-c');
		expect(unusedEntries).not.toContain('src/a.html:rule-a');
	});

	it('handles mixed scenario: one suppressed, one over limit, one unknown', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b'), v('rule-b'), v('rule-b'), v('rule-c')]],
		]);
		const suppressions = {
			'src/a.html': {
				'rule-a': { count: 2 }, // exact match → suppressed
				'rule-b': { count: 1 }, // exceeded → all reported
			},
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		const result = filtered.get('/project/src/a.html')!;

		// rule-a: 2 violations, count=2 → suppressed (0 remaining)
		// rule-b: 3 violations, count=1 → all 3 reported
		// rule-c: 1 violation, not in suppressions → reported
		expect(result).toHaveLength(4);
		expect(result.filter(r => r.ruleId === 'rule-a')).toHaveLength(0);
		expect(result.filter(r => r.ruleId === 'rule-b')).toHaveLength(3);
		expect(result.filter(r => r.ruleId === 'rule-c')).toHaveLength(1);
	});
});
