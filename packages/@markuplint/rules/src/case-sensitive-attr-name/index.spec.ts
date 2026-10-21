import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[case-sensitive-attr-name-valid-001] lower case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-lowercase></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[case-sensitive-attr-name-invalid-001] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-UPPERCASE="value"></div>');
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements should be lowercase');
		expect(violations[0]?.raw).toBe('data-UPPERCASE');
	});

	test('[case-sensitive-attr-name-invalid-002] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-UPPERCASE="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations[0]?.severity).toBe('error');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('[case-sensitive-attr-name-invalid-003] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-uppercase="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations[0]?.severity).toBe('error');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('[case-sensitive-attr-name-valid-002] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-UPPERCASE="value"></div>', {
			rule: { severity: 'error', value: 'upper' },
		});
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-attr-name-valid-003] svg', async () => {
		const { violations } = await mlRuleTest(rule, '<svg viewBox="0 0 100 100"></svg>');
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-attr-name-parser-001] JSX event prop keeps its case', async () => {
		const { violations, fixedCode } = await mlRuleTest(
			rule,
			'<button onClick={onPress}></button>',
			{ parser: { '.*': '@markuplint/jsx-parser' } },
			true,
		);
		expect(violations).toStrictEqual([]);
		expect(fixedCode).toBe('<button onClick={onPress}></button>');
	});

	test('[case-sensitive-attr-name-parser-002] JSX non-event camelCase prop keeps its case', async () => {
		const { violations, fixedCode } = await mlRuleTest(
			rule,
			'<div suppressHydrationWarning></div>',
			{ parser: { '.*': '@markuplint/jsx-parser' } },
			true,
		);
		expect(violations).toStrictEqual([]);
		expect(fixedCode).toBe('<div suppressHydrationWarning></div>');
	});

	test('[case-sensitive-attr-name-parser-003] MDX JSX prop keeps its case', async () => {
		const { violations } = await mlRuleTest(rule, '<button onClick={onPress}></button>', {
			parser: { '.*': '@markuplint/mdx-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[case-sensitive-attr-name-parser-004] Svelte attribute names stay case-insensitive', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-ATTR="value"></div>', {
			parser: { '.*': '@markuplint/svelte-parser' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'DATA-ATTR',
				message: 'Attribute names of HTML elements should be lowercase',
			},
		]);
	});

	test('[case-sensitive-attr-name-parser-005] Astro attribute names stay case-insensitive', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-ATTR="value"></div>', {
			parser: { '.*': '@markuplint/astro-parser' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'DATA-ATTR',
				message: 'Attribute names of HTML elements should be lowercase',
			},
		]);
	});

	test('[case-sensitive-attr-name-invalid-004] HTML inline handler spelled in camelCase is still reported', async () => {
		const { violations } = await mlRuleTest(rule, '<button onClick="onPress()"></button>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'onClick',
				message: 'Attribute names of HTML elements should be lowercase',
			},
		]);
	});
});

describe('fix', () => {
	test('[case-sensitive-attr-name-fix-001] upper case', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<DIV DATA-LOWERCASE></DIV>', undefined, true);
		expect(fixedCode).toBe('<DIV data-lowercase></DIV>');
	});

	test('[case-sensitive-attr-name-fix-002] upper case', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<DIV data-lowercase></DIV>', { rule: 'upper' }, true);
		expect(fixedCode).toBe('<DIV DATA-LOWERCASE></DIV>');
	});
});

describe('foreign elements', () => {
	test('[case-sensitive-attr-name-issue-4309-001] an SVG attribute is checked against the case of its spec', async () => {
		const { violations } = await mlRuleTest(rule, '<svg viewbox="0 0 1 1"></svg>');
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'viewbox',
				message: 'The "viewbox" attribute should be "viewBox"',
			},
		]);
	});

	test('[case-sensitive-attr-name-issue-4309-002] the case of the spec is what the fix writes, whatever the option says', async () => {
		const upper = await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1"></svg>', { rule: 'upper' });
		expect(upper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'VIEWBOX',
				message: 'The "VIEWBOX" attribute should be "viewBox"',
			},
		]);
		const fixedUpper = await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1"></svg>', { rule: 'upper' }, true);
		expect(fixedUpper.fixedCode).toBe('<svg viewBox="0 0 1 1"></svg>');
		const fixedLower = await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1"></svg>', undefined, true);
		expect(fixedLower.fixedCode).toBe('<svg viewBox="0 0 1 1"></svg>');
		const fixedLowerCase = await mlRuleTest(rule, '<svg viewbox="0 0 1 1"></svg>', undefined, true);
		expect(fixedLowerCase.fixedCode).toBe('<svg viewBox="0 0 1 1"></svg>');
	});

	test('[case-sensitive-attr-name-issue-4309-003] an HTML attribute on an SVG element is fixed to the case of the spec', async () => {
		const { violations } = await mlRuleTest(rule, '<svg CLASS="a"></svg>', { rule: 'upper' });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'CLASS',
				message: 'The "CLASS" attribute should be "class"',
			},
		]);
		const { fixedCode } = await mlRuleTest(rule, '<svg CLASS="a"></svg>', { rule: 'upper' }, true);
		expect(fixedCode).toBe('<svg class="a"></svg>');
	});

	test('[case-sensitive-attr-name-issue-4309-004] the spelling of the spec is valid, as is a name that has no spec', async () => {
		const spelled = await mlRuleTest(rule, '<svg viewBox="0 0 1 1" class="a" data-Foo="b"></svg>');
		expect(spelled.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1" class="a" data-Foo="b"></svg>');
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'VIEWBOX',
				message: 'The "VIEWBOX" attribute should be "viewBox"',
			},
		]);
	});

	test('[case-sensitive-attr-name-issue-4309-005] JSX is still skipped', async () => {
		const options = { parser: { '.*': '@markuplint/jsx-parser' } };
		const jsx = await mlRuleTest(rule, '<svg viewbox="0 0 1 1"></svg>', options);
		expect(jsx.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<svg viewbox="0 0 1 1"></svg>');
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'viewbox',
				message: 'The "viewbox" attribute should be "viewBox"',
			},
		]);
	});

	test('[case-sensitive-attr-name-issue-4309-006] Svelte: a static name is checked, a dynamic one is set by code and is not', async () => {
		const options = { parser: { '.*': '@markuplint/svelte-parser' } };
		expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1"></svg>', options)).violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 6,
				raw: 'VIEWBOX',
				message: 'The "VIEWBOX" attribute should be "viewBox"',
			},
		]);
		expect((await mlRuleTest(rule, '<svg VIEWBOX={x}></svg>', options)).violations).toStrictEqual([]);
	});

	test('[case-sensitive-attr-name-issue-4309-007] Vue: an upper-case name on an HTML element is reported, as in HTML', async () => {
		const options = { parser: { '.*': '@markuplint/vue-parser' } };
		expect(
			(await mlRuleTest(rule, '<template><div DATA-X="1"></div></template>', options)).violations,
		).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 16,
				raw: 'DATA-X',
				message: 'Attribute names of HTML elements should be lowercase',
			},
		]);
		expect(
			(await mlRuleTest(rule, '<template><svg ROLE="img"></svg></template>', options)).violations,
		).toStrictEqual([]);
	});
});
