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

	test('formats message with specConformance and unified separator', () => {
		const result = {
			filePath: '/test.html',
			sourceCode: '<div></div>',
			violations: [
				{
					ruleId: 'permitted-contents',
					severity: 'error' as const,
					message: 'Not allowed here',
					reason: 'content model violation',
					specConformance: 'normative' as const,
					line: 1,
					col: 1,
					raw: '<div>',
				},
			],
			fixedCode: '<div></div>',
			status: 'processed' as const,
		};

		const diagnostics = convertDiagnostics(result);
		expect(diagnostics[0]!.message).toBe('Not allowed here [normative] / content model violation');
		expect(diagnostics[0]!.code).toBe('permitted-contents');
	});

	test('uses name as code and appends ruleId to message when name is present', () => {
		const result = {
			filePath: '/test.html',
			sourceCode: '<div></div>',
			violations: [
				{
					ruleId: 'permitted-contents',
					name: 'html-standard/permitted-contents',
					severity: 'error' as const,
					message: 'Not allowed here',
					reason: 'content model violation',
					specConformance: 'normative' as const,
					line: 1,
					col: 1,
					raw: '<div>',
				},
			],
			fixedCode: '<div></div>',
			status: 'processed' as const,
		};

		const diagnostics = convertDiagnostics(result);
		expect(diagnostics[0]!.message).toBe(
			'Not allowed here [normative] / content model violation (permitted-contents)',
		);
		expect(diagnostics[0]!.code).toBe('html-standard/permitted-contents');
	});

	test('omits specConformance from message when absent', () => {
		const result = {
			filePath: '/test.html',
			sourceCode: '<div></div>',
			violations: [
				{
					ruleId: 'some-rule',
					severity: 'warning' as const,
					message: 'Some issue',
					line: 1,
					col: 1,
					raw: '<div>',
				},
			],
			fixedCode: '<div></div>',
			status: 'processed' as const,
		};

		const diagnostics = convertDiagnostics(result);
		expect(diagnostics[0]!.message).toBe('Some issue');
		expect(diagnostics[0]!.code).toBe('some-rule');
	});

	test('returns empty array for null result', () => {
		const diagnostics = convertDiagnostics(null);
		expect(diagnostics).toHaveLength(0);
	});
});
