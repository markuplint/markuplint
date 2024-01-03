import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body>text</body></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Require the "h1" element',
			line: 1,
			col: 1,
			raw: '<',
		},
	]);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1></body></html>');
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1><h1>text</h1></body></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "h1" element is duplicated',
			line: 1,
			col: 26,
			raw: '<h1>',
		},
	]);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1><h1>text</h1></body></html>', {
		rule: {
			severity: 'error',
			value: true,
			options: {
				'expected-once': false,
			},
		},
	});
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>');
	expect(violations.length).toBe(0);
});

test('enable option "in-document-fragment"', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>', {
		rule: {
			severity: 'error',
			options: {
				'in-document-fragment': true,
			},
		},
	});
	expect(violations.length).toBe(1);
});

test('The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<html><body><x-h1 as="h1">text</x-h1></body></html>')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<html><body><x-h2 as="h2">text</x-h2></body></html>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require the "h1" element',
			raw: '<',
		},
	]);
});

test('Issue #57', async () => {
	const { violations } = await mlRuleTest(rule, '');
	expect(violations.length).toBe(0);
});
