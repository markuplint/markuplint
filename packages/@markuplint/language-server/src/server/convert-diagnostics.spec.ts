import { DiagnosticSeverity } from 'vscode-languageserver/node.js';
import { describe, test, expect } from 'vitest';

import { applySeverityMap, convertDiagnostics } from './convert-diagnostics.js';

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

describe('applySeverityMap', () => {
	const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } };
	const diagnostics = [
		{ severity: DiagnosticSeverity.Error, message: 'e', range },
		{ severity: DiagnosticSeverity.Warning, message: 'w', range },
		{ severity: DiagnosticSeverity.Information, message: 'i', range },
	];

	test('returns the diagnostics unchanged without a map', () => {
		expect(applySeverityMap(diagnostics)).toStrictEqual(diagnostics);
	});

	test('re-reports a warning as an error', () => {
		const mapped = applySeverityMap(diagnostics, { warning: 'error' });
		expect(mapped.map(d => d.severity)).toStrictEqual([
			DiagnosticSeverity.Error,
			DiagnosticSeverity.Error,
			DiagnosticSeverity.Information,
		]);
	});

	test('maps every severity the LSP defines', () => {
		const mapped = applySeverityMap(diagnostics, { error: 'hint', warning: 'info', info: 'warning' });
		expect(mapped.map(d => d.severity)).toStrictEqual([
			DiagnosticSeverity.Hint,
			DiagnosticSeverity.Information,
			DiagnosticSeverity.Warning,
		]);
	});

	test('does not mutate its input', () => {
		applySeverityMap(diagnostics, { warning: 'error' });
		expect(diagnostics[1]!.severity).toBe(DiagnosticSeverity.Warning);
	});
});
