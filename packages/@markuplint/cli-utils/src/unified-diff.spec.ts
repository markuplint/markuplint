import stripAnsi from 'strip-ansi';
import { describe, test, expect } from 'vitest';

import { unifiedDiff } from './unified-diff.js';

describe('unifiedDiff', () => {
	test('identical inputs return empty string', () => {
		const result = unifiedDiff('test.html', 'hello\nworld', 'hello\nworld');
		expect(result).toBe('');
	});

	test('empty string inputs return empty string', () => {
		const result = unifiedDiff('test.html', '', '');
		expect(result).toBe('');
	});

	test('single line change', () => {
		const result = unifiedDiff('test.html', '<DIV>hello</DIV>', '<div>hello</div>');
		const stripped = stripAnsi(result);
		const lines = stripped.split('\n');
		expect(lines[0]).toBe('--- a/test.html');
		expect(lines[1]).toBe('+++ b/test.html');
		expect(lines[2]).toMatch(/^@@ -1,1 \+1,1 @@$/);
		expect(lines[3]).toBe('-<DIV>hello</DIV>');
		expect(lines[4]).toBe('+<div>hello</div>');
	});

	test('multiline diff with context and correct hunk header', () => {
		const original = ['<html>', '<body>', '<DIV>test</DIV>', '</body>', '</html>'].join('\n');
		const fixed = ['<html>', '<body>', '<div>test</div>', '</body>', '</html>'].join('\n');
		const result = unifiedDiff('index.html', original, fixed);
		const stripped = stripAnsi(result);
		const lines = stripped.split('\n');
		expect(lines[0]).toBe('--- a/index.html');
		expect(lines[1]).toBe('+++ b/index.html');
		// Hunk header should reflect context lines
		expect(lines[2]).toMatch(/^@@ .+ @@$/);
		expect(lines).toContain('-<DIV>test</DIV>');
		expect(lines).toContain('+<div>test</div>');
		// Context lines should be present
		expect(lines).toContain(' <body>');
		expect(lines).toContain(' </body>');
	});

	test('insertion produces + lines', () => {
		const result = unifiedDiff('test.html', '<div></div>', '<div>\n  <span></span>\n</div>');
		const stripped = stripAnsi(result);
		const lines = stripped.split('\n');
		expect(lines[0]).toBe('--- a/test.html');
		expect(lines[1]).toBe('+++ b/test.html');
		expect(lines.some(l => l.startsWith('+') && !l.startsWith('+++'))).toBe(true);
	});

	test('deletion produces - lines', () => {
		const result = unifiedDiff('test.html', '<div>\n  <span></span>\n</div>', '<div></div>');
		const stripped = stripAnsi(result);
		const lines = stripped.split('\n');
		expect(lines[0]).toBe('--- a/test.html');
		expect(lines[1]).toBe('+++ b/test.html');
		expect(lines.some(l => l.startsWith('-') && !l.startsWith('---'))).toBe(true);
	});

	test('multiple separate changes create separate hunks', () => {
		// Changes at lines 2 and 10 (far apart) should produce separate hunks
		const original = Array.from({ length: 12 }, (_, i) => `line${i + 1}`);
		const fixed = [...original];
		fixed[1] = 'CHANGED2';
		fixed[10] = 'CHANGED11';
		const result = unifiedDiff('test.html', original.join('\n'), fixed.join('\n'));
		const stripped = stripAnsi(result);
		const hunkHeaders = stripped.split('\n').filter(l => l.startsWith('@@'));
		expect(hunkHeaders.length).toBe(2);
	});

	test('empty to non-empty produces all + lines', () => {
		const result = unifiedDiff('test.html', '', 'hello\nworld');
		const stripped = stripAnsi(result);
		expect(stripped).toContain('+hello');
		expect(stripped).toContain('+world');
	});
});
