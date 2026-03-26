import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import { generateSuppressions } from './generate-suppressions.js';

function v(ruleId: string, severity: 'error' | 'warning' | 'info' = 'error'): Violation {
	return { ruleId, severity, message: 'test', line: 1, col: 1, raw: '' };
}

describe('generateSuppressions', () => {
	const suppressionsPath = '/project/markuplint-suppressions.json';

	it('counts error violations per file and rule', () => {
		const map = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b')]],
			['/project/src/b.html', [v('rule-c')]],
		]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 2 },
				'rule-b': { count: 1 },
			},
			'src/b.html': {
				'rule-c': { count: 1 },
			},
		});
	});

	it('ignores warning and info violations', () => {
		const map = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a', 'error'), v('rule-b', 'warning'), v('rule-c', 'info')]],
		]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 1 },
			},
		});
	});

	it('filters by specific rule when filterRule is provided', () => {
		const map = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b')]]]);

		const result = generateSuppressions(map, suppressionsPath, 'rule-a');
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 2 },
			},
		});
	});

	it('returns empty object when no error violations exist', () => {
		const map = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a', 'warning')]]]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({});
	});

	it('returns empty object for empty input', () => {
		const result = generateSuppressions(new Map(), suppressionsPath);
		expect(result).toStrictEqual({});
	});
});
