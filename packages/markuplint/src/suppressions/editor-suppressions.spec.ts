import { describe, test, expect } from 'vitest';

import type { Violation } from '@markuplint/ml-config';

import { analyzeForDowngrade, applyDowngrade } from './downgrade-severity.js';

function createViolation(overrides: Partial<Violation> = {}): Violation {
	return {
		ruleId: 'attr-duplication',
		severity: 'error',
		message: 'Duplicate attribute',
		line: 1,
		col: 1,
		raw: 'class',
		...overrides,
	};
}

describe('analyzeForDowngrade', () => {
	test('returns empty sets when no suppression entry for the file', () => {
		const violations = [createViolation()];

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			{},
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(0);
		expect(result.exceedingThreshold.size).toBe(0);
	});

	test('marks all violations as within threshold when count <= suppressed count', () => {
		const violations = [
			createViolation({ ruleId: 'attr-duplication', line: 5 }),
			createViolation({ ruleId: 'attr-duplication', line: 10 }),
		];
		const suppressions = {
			'src/index.html': {
				'attr-duplication': { count: 3 },
			},
		};

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			suppressions,
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(2);
		expect(result.withinThreshold.has(0)).toBe(true);
		expect(result.withinThreshold.has(1)).toBe(true);
		expect(result.exceedingThreshold.size).toBe(0);
	});

	test('marks violations as within threshold when count equals suppressed count', () => {
		const violations = [createViolation({ ruleId: 'attr-duplication', line: 5 })];
		const suppressions = {
			'src/index.html': {
				'attr-duplication': { count: 1 },
			},
		};

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			suppressions,
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(1);
		expect(result.withinThreshold.has(0)).toBe(true);
	});

	test('marks violations as exceeding threshold when count > suppressed count', () => {
		const violations = [
			createViolation({ ruleId: 'attr-duplication', line: 5 }),
			createViolation({ ruleId: 'attr-duplication', line: 10 }),
			createViolation({ ruleId: 'attr-duplication', line: 15 }),
		];
		const suppressions = {
			'src/index.html': {
				'attr-duplication': { count: 2 },
			},
		};

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			suppressions,
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(0);
		expect(result.exceedingThreshold.size).toBe(1);
		expect(result.exceedingThreshold.get('attr-duplication')).toEqual([0, 1, 2]);
	});

	test('does not include warning or info severity violations', () => {
		const violations = [
			createViolation({ ruleId: 'attr-duplication', severity: 'warning', line: 5 }),
			createViolation({ ruleId: 'attr-duplication', severity: 'info', line: 10 }),
		];
		const suppressions = {
			'src/index.html': {
				'attr-duplication': { count: 5 },
			},
		};

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			suppressions,
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(0);
		expect(result.exceedingThreshold.size).toBe(0);
	});

	test('handles multiple rules independently', () => {
		const violations = [
			createViolation({ ruleId: 'attr-duplication', line: 5 }),
			createViolation({ ruleId: 'case-sensitive-attr-name', line: 10 }),
		];
		const suppressions = {
			'src/index.html': {
				'attr-duplication': { count: 1 },
			},
		};

		const result = analyzeForDowngrade(
			'/project/src/index.html',
			violations,
			suppressions,
			'/project/markuplint-suppressions.json',
		);

		expect(result.withinThreshold.size).toBe(1);
		expect(result.withinThreshold.has(0)).toBe(true); // attr-duplication suppressed
		expect(result.withinThreshold.has(1)).toBe(false); // case-sensitive not suppressed
	});
});

describe('applyDowngrade', () => {
	test('downgrades severity to info for specified indices', () => {
		const violations = [
			createViolation({ ruleId: 'attr-duplication', severity: 'error', line: 5 }),
			createViolation({ ruleId: 'case-sensitive-attr-name', severity: 'error', line: 10 }),
		];

		const result = applyDowngrade(violations, new Set([0]));

		expect(result).toHaveLength(2);
		expect(result[0]!.severity).toBe('info');
		expect(result[0]!.originalSeverity).toBe('error');
		expect(result[1]!.severity).toBe('error');
		expect(result[1]!.originalSeverity).toBeUndefined();
	});

	test('returns violations unchanged when no indices to downgrade', () => {
		const violations = [createViolation({ severity: 'error' })];

		const result = applyDowngrade(violations, new Set());

		expect(result).toHaveLength(1);
		expect(result[0]!.severity).toBe('error');
		expect(result[0]!.originalSeverity).toBeUndefined();
	});

	test('downgrades all violations when all indices specified', () => {
		const violations = [createViolation({ line: 1 }), createViolation({ line: 5 }), createViolation({ line: 10 })];

		const result = applyDowngrade(violations, new Set([0, 1, 2]));

		expect(result.every(v => v.severity === 'info')).toBe(true);
		expect(result.every(v => v.originalSeverity === 'error')).toBe(true);
	});
});
