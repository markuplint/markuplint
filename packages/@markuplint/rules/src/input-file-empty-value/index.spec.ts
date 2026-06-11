import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[input-file-empty-value-valid-001] no value attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file">');
	expect(violations.length).toBe(0);
});

test('[input-file-empty-value-valid-002] empty value attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="file" value="">');
	expect(violations.length).toBe(0);
});

test('[input-file-empty-value-valid-003] non-file type with value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" value="anything">');
	expect(violations.length).toBe(0);
});

test('[input-file-empty-value-invalid-001] non-empty value on type=file', async () => {
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

test('[input-file-empty-value-invalid-002] case-insensitive type matching', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="FILE" value="x">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.raw).toBe('x');
});
