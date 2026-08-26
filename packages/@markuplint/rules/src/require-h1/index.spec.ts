import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-h1-invalid-001] h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body>text</body></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			message: 'Require the "h1" element',
			line: 1,
			col: 1,
			raw: '<',
		},
	]);
});

test('[require-h1-valid-001] h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1></body></html>');
	expect(violations.length).toBe(0);
});

test('[require-h1-valid-002] h1', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>');
	expect(violations.length).toBe(0);
});

test('[require-h1-invalid-002] enable option "in-document-fragment"', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>', {
		rule: {
			options: {
				'in-document-fragment': true,
			},
		},
	});
	expect(violations.length).toBe(1);
});

test('[require-h1-invalid-003] The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<html><body><x-h1 as="h1">text</x-h1></body></html>')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<html><body><x-h2 as="h2">text</x-h2></body></html>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'Require the "h1" element',
			raw: '<',
		},
	]);
});

test('[require-h1-valid-003] Issue #57', async () => {
	const { violations } = await mlRuleTest(rule, '');
	expect(violations.length).toBe(0);
});
