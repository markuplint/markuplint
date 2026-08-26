import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-h1-invalid-001] h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1><h1>text</h1></body></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			message: 'The "h1" element is duplicated',
			line: 1,
			col: 26,
			raw: '<h1>',
		},
	]);
});

test('[no-duplicate-h1-valid-001] h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1></body></html>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-h1-valid-002] rule disabled', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1><h1>text</h1></body></html>', {
		rule: false,
	});
	expect(violations.length).toBe(0);
});

test('[no-duplicate-h1-valid-003] fragment without in-document-fragment option', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h1>text</h1><h1>text</h1></div>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-h1-invalid-002] enable option "in-document-fragment"', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h1>text</h1><h1>text</h1></div>', {
		rule: {
			options: {
				'in-document-fragment': true,
			},
		},
	});
	expect(violations.length).toBe(1);
});

test('[no-duplicate-h1-valid-004] Issue #57', async () => {
	const { violations } = await mlRuleTest(rule, '');
	expect(violations.length).toBe(0);
});
