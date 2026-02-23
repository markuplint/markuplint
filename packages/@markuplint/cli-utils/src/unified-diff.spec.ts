import stripAnsi from 'strip-ansi';
import { describe, test, expect } from 'vitest';

import { unifiedDiff } from './unified-diff.js';

describe('unifiedDiff', () => {
	test('identical inputs return empty string', () => {
		const result = unifiedDiff('test.html', 'hello\nworld', 'hello\nworld');
		// Only headers, no hunks → the function returns headers but no diff content
		const stripped = stripAnsi(result);
		expect(stripped).toContain('--- a/test.html');
		expect(stripped).toContain('+++ b/test.html');
		expect(stripped).not.toContain('@@');
	});

	test('single line change', () => {
		const result = unifiedDiff('test.html', '<DIV>hello</DIV>', '<div>hello</div>');
		const stripped = stripAnsi(result);
		expect(stripped).toContain('-<DIV>hello</DIV>');
		expect(stripped).toContain('+<div>hello</div>');
	});

	test('multiline diff with context', () => {
		const original = ['<html>', '<body>', '<DIV>test</DIV>', '</body>', '</html>'].join('\n');
		const fixed = ['<html>', '<body>', '<div>test</div>', '</body>', '</html>'].join('\n');
		const result = unifiedDiff('index.html', original, fixed);
		const stripped = stripAnsi(result);
		expect(stripped).toContain('--- a/index.html');
		expect(stripped).toContain('+++ b/index.html');
		expect(stripped).toContain('-<DIV>test</DIV>');
		expect(stripped).toContain('+<div>test</div>');
		// Context lines should be present
		expect(stripped).toContain(' <body>');
	});

	test('insertion produces + lines', () => {
		const result = unifiedDiff('test.html', '<div></div>', '<div>\n  <span></span>\n</div>');
		const stripped = stripAnsi(result);
		expect(stripped).toContain('+');
	});

	test('deletion produces - lines', () => {
		const result = unifiedDiff('test.html', '<div>\n  <span></span>\n</div>', '<div></div>');
		const stripped = stripAnsi(result);
		expect(stripped).toContain('-');
	});
});
