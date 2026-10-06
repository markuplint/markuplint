import type { FixState } from './v4.js';
import type { Diagnostic } from 'vscode-languageserver';

import { describe, test, expect } from 'vitest';
import { DiagnosticSeverity, CodeActionKind } from 'vscode-languageserver';

import {
	offsetToPosition,
	createQuickFixActions,
	createFixAllAction,
	SOURCE_FIX_ALL_MARKUPLINT,
} from './code-actions.js';

describe('offsetToPosition', () => {
	test('offset 0 returns line 0, character 0', () => {
		expect(offsetToPosition('hello', 0)).toEqual({ line: 0, character: 0 });
	});

	test('offset after newline returns correct line/character', () => {
		const src = 'line1\nline2';
		// offset 6 = start of 'line2'
		expect(offsetToPosition(src, 6)).toEqual({ line: 1, character: 0 });
	});

	test('offset in middle of second line', () => {
		const src = 'abc\ndef';
		// offset 5 = 'e' in 'def'
		expect(offsetToPosition(src, 5)).toEqual({ line: 1, character: 1 });
	});

	test('offset at end of source', () => {
		const src = 'ab\ncd';
		expect(offsetToPosition(src, 5)).toEqual({ line: 1, character: 2 });
	});

	test('empty string returns line 0, character 0', () => {
		expect(offsetToPosition('', 0)).toEqual({ line: 0, character: 0 });
	});
});

function makeDiagnostic(index: number, message = 'test'): Diagnostic {
	return {
		severity: DiagnosticSeverity.Error,
		range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
		message,
		source: 'markuplint',
		data: { violationIndex: index },
	};
}

describe('createQuickFixActions', () => {
	test('creates QuickFix for violation with fix', () => {
		const fixState: FixState = {
			sourceCode: '<div class="">',
			violations: [
				{
					ruleId: 'class-naming',
					severity: 'error',
					message: 'Empty class',
					line: 1,
					col: 6,
					raw: 'class=""',
					fix: {
						edits: [{ range: [5, 13], text: '' }],
					},
				},
			],
			fixedCode: '<div>',
			fixSummary: null,
		};

		const diag = makeDiagnostic(0, 'Empty class');
		const actions = createQuickFixActions('file:///test.html', [diag], fixState);

		expect(actions).toHaveLength(1);
		const action = actions[0]!;
		expect(action.kind).toBe(CodeActionKind.QuickFix);
		expect(action.isPreferred).toBe(true);
		expect(action.diagnostics).toEqual([diag]);
		expect(action.edit?.changes?.['file:///test.html']).toHaveLength(1);
	});

	test('returns empty for violation without fix', () => {
		const fixState: FixState = {
			sourceCode: '<div>',
			violations: [
				{
					ruleId: 'some-rule',
					severity: 'warning',
					message: 'No fix',
					line: 1,
					col: 1,
					raw: '<div>',
				},
			],
			fixedCode: '<div>',
			fixSummary: null,
		};

		const diag = makeDiagnostic(0, 'No fix');
		const actions = createQuickFixActions('file:///test.html', [diag], fixState);

		expect(actions).toHaveLength(0);
	});

	test('skips diagnostic without violationIndex', () => {
		const fixState: FixState = {
			sourceCode: '<div>',
			violations: [],
			fixedCode: '<div>',
			fixSummary: null,
		};

		const diag: Diagnostic = {
			severity: DiagnosticSeverity.Error,
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
			message: 'test',
			source: 'markuplint',
		};

		const actions = createQuickFixActions('file:///test.html', [diag], fixState);

		expect(actions).toHaveLength(0);
	});

	test('converts TextEdit offsets to correct LSP Range', () => {
		// Source: "ab\ncd" (5 chars)
		// Edit: replace offset [3,5] ("cd") with "ef"
		const fixState: FixState = {
			sourceCode: 'ab\ncd',
			violations: [
				{
					ruleId: 'test',
					severity: 'error',
					message: 'msg',
					line: 2,
					col: 1,
					raw: 'cd',
					fix: {
						edits: [{ range: [3, 5], text: 'ef' }],
					},
				},
			],
			fixedCode: 'ab\nef',
			fixSummary: null,
		};

		const diag = makeDiagnostic(0);
		const actions = createQuickFixActions('file:///test.html', [diag], fixState);

		const edit = actions[0]!.edit!.changes!['file:///test.html']![0]!;
		expect(edit.range.start).toEqual({ line: 1, character: 0 });
		expect(edit.range.end).toEqual({ line: 1, character: 2 });
		expect(edit.newText).toBe('ef');
	});
});

describe('createFixAllAction', () => {
	test('returns null when fixedCode equals sourceCode', () => {
		const fixState: FixState = {
			sourceCode: '<div>',
			violations: [],
			fixedCode: '<div>',
			fixSummary: null,
		};

		const result = createFixAllAction('file:///test.html', [], fixState);

		expect(result).toBeNull();
	});

	test('uses firstPassEdits when available', () => {
		const fixState: FixState = {
			sourceCode: 'ab\ncd',
			violations: [],
			fixedCode: 'ab\nef',
			fixSummary: {
				passCount: 1,
				totalApplied: 1,
				totalSkipped: 0,
				reachedMaxPasses: false,
				firstPassEdits: [{ range: [3, 5], text: 'ef' }],
			},
		};

		const result = createFixAllAction('file:///test.html', [], fixState)!;

		expect(result).not.toBeNull();
		expect(result.kind).toBe(SOURCE_FIX_ALL_MARKUPLINT);
		const edits = result.edit!.changes!['file:///test.html']!;
		expect(edits).toHaveLength(1);
		expect(edits[0]!.range.start).toEqual({ line: 1, character: 0 });
		expect(edits[0]!.newText).toBe('ef');
	});

	test('falls back to full-document replacement when no firstPassEdits', () => {
		const fixState: FixState = {
			sourceCode: 'ab\ncd',
			violations: [],
			fixedCode: 'ab\nef',
			fixSummary: null,
		};

		const result = createFixAllAction('file:///test.html', [], fixState)!;

		expect(result).not.toBeNull();
		const edits = result.edit!.changes!['file:///test.html']!;
		expect(edits).toHaveLength(1);
		expect(edits[0]!.range.start).toEqual({ line: 0, character: 0 });
		expect(edits[0]!.range.end).toEqual({ line: 1, character: 2 });
		expect(edits[0]!.newText).toBe('ab\nef');
	});

	test('includes all diagnostics', () => {
		const fixState: FixState = {
			sourceCode: '<div>',
			violations: [],
			fixedCode: '<span>',
			fixSummary: null,
		};

		const diags = [makeDiagnostic(0, 'a'), makeDiagnostic(1, 'b')];
		const result = createFixAllAction('file:///test.html', diags, fixState)!;

		expect(result.diagnostics).toHaveLength(2);
	});
});
