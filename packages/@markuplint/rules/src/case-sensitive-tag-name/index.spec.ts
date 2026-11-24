import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[case-sensitive-tag-name-001] lower case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-lowercase></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[case-sensitive-tag-name-002] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<DIV data-lowercase></DIV>');
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toBe('Tag names of HTML elements should be lowercase');
		expect(violations[0]?.raw).toBe('DIV');
	});

	test('[case-sensitive-tag-name-003] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-UPPERCASE="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations[0]?.severity).toBe('error');
		expect(violations[0]?.message).toBe('Tag names of HTML elements must be uppercase');
	});

	test('[case-sensitive-tag-name-004] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<DIV data-uppercase="value"></DIV>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-tag-name-005] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<DIV DATA-UPPERCASE="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations.length).toBe(1);
	});

	test('[case-sensitive-tag-name-006] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-UPPERCASE="value"></DIV>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations.length).toBe(1);
	});

	test('[case-sensitive-tag-name-007] svg', async () => {
		const { violations } = await mlRuleTest(rule, '<svg viewBox="0 0 100 100"><textPath></textPath></svg>');
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-tag-name-008] custom elements', async () => {
		const { violations } = await mlRuleTest(rule, '<xxx-hoge>lorem</xxx-hoge>');
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-tag-name-009] no custom elements (Started upper-case)', async () => {
		const { violations } = await mlRuleTest(rule, '<XXX-hoge>lorem</XXX-hoge>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 2,
				message: 'Tag names of HTML elements should be lowercase',
				raw: 'XXX-hoge',
			},
			{
				severity: 'warning',
				line: 1,
				col: 16,
				message: 'Tag names of HTML elements should be lowercase',
				raw: '</XXX-hoge>',
			},
		]);
	});

	test('[case-sensitive-tag-name-010] custom elements end tag', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<MyComponent>
  <h1 X>Hello world!</h1>
</MyComponent>`,
			{
				parser: {
					'.*': '@markuplint/astro-parser',
				},
			},
		);
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('[case-sensitive-tag-name-011] upper case', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<DIV data-lowercase></DIV>', undefined, true);
		expect(fixedCode).toBe('<div data-lowercase></div>');
	});
});

test('[case-sensitive-tag-name-012] an element in a foreign namespace is left to the HTML parser, which names it as the standard says whatever case it is written in', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><FOREIGNOBJECT></FOREIGNOBJECT><textPath></textPath></svg>');
	expect(violations).toStrictEqual([]);
});

test('[case-sensitive-tag-name-016] the end tag of an element whose start tag is omitted is fixed at its own name', async () => {
	const code = '<!doctype html><head></head><body></body></HTML>';
	const { violations, fixedCode } = await mlRuleTest(rule, code, undefined, true);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 42,
			raw: '</HTML>',
			message: 'Tag names of HTML elements should be lowercase',
			fix: { edits: [{ range: [43, 47], text: 'html' }] },
		},
	]);
	expect(fixedCode).toBe('<!doctype html><head></head><body></body></html>');
});
