import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-input-file-value-001] no value attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file">');
	expect(violations.length).toBe(0);
});

test('[no-input-file-value-002] empty value attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" value="">');
	expect(violations.length).toBe(0);
});

test('[no-input-file-value-003] non-file type with value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" value="anything">');
	expect(violations.length).toBe(0);
});

test('[no-input-file-value-004] non-empty value on type=file', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" value="document.pdf">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The "value" attribute on a "input" element with "type=file" must be the empty string',
			raw: 'document.pdf',
		},
	]);
});

test('[no-input-file-value-005] case-insensitive type matching', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="FILE" value="x">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.raw).toBe('x');
});

test('[no-input-file-value-006] the names of the attributes are shown as written (`type` and `value` are also keywords) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" value="x">', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: '「type=file」の「input」要素の「value」属性は空文字列であるべきです',
			raw: 'x',
		},
	]);
});
