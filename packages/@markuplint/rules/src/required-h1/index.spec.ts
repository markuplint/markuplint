import { mlRuleTest } from 'markuplint';

import rule from './';

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body>text</body></html>', { rule: true });
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
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1></body></html>', { rule: true });
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><h1>text</h1><h1>text</h1></body></html>', {
		rule: true,
	});
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
			option: {
				'expected-once': false,
			},
		},
	});
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>', { rule: true });
	expect(violations.length).toBe(0);
});

test('enable to option "in-document-fragment"', async () => {
	const { violations } = await mlRuleTest(rule, '<div><h2>text</h2></div>', {
		rule: {
			severity: 'error',
			option: {
				'in-document-fragment': true,
			},
		},
	});
	expect(violations.length).toBe(1);
});

test('Issue #57', async () => {
	const { violations } = await mlRuleTest(rule, '', { rule: true });
	expect(violations.length).toBe(0);
});
