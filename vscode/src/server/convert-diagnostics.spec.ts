import { describe, test, expect } from 'vitest';

import { convertDiagnostics } from './convert-diagnostics.js';

describe('convertDiagnostics', () => {
	test('sets data.violationIndex on each diagnostic', () => {
		const result = {
			filePath: '/test.html',
			sourceCode: '<div><span></span></div>',
			violations: [
				{ ruleId: 'rule-a', severity: 'error' as const, message: 'Error A', line: 1, col: 1, raw: '<div>' },
				{
					ruleId: 'rule-b',
					severity: 'warning' as const,
					message: 'Warning B',
					line: 1,
					col: 6,
					raw: '<span>',
				},
			],
			fixedCode: '<div><span></span></div>',
			status: 'processed' as const,
		};

		const diagnostics = convertDiagnostics(result);

		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0]!.data).toEqual({ violationIndex: 0 });
		expect(diagnostics[1]!.data).toEqual({ violationIndex: 1 });
	});

	test('returns empty array for null result', () => {
		const diagnostics = convertDiagnostics(null);
		expect(diagnostics).toHaveLength(0);
	});
});
