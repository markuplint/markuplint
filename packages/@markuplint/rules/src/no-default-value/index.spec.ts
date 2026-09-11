import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-default-value-invalid-001] canvas', async () => {
	const { violations } = await mlRuleTest(rule, '<canvas width="300" height="150"></canvas>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: '300',
			message: 'It is the default value',
		},
		{
			severity: 'warning',
			line: 1,
			col: 29,
			raw: '150',
			message: 'It is the default value',
		},
	]);
});

test('[no-default-value-invalid-002] svg|image', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<svg>
  <image preserveAspectRatio="xMidYMid meet" />
  <image preserveAspectRatio="xMidYMid   meet" />
  <image preserveAspectRatio=" xMidYMid meet " />
  <image preserveAspectRatio="XMIDYMID MEET" />
  <image preserveAspectRatio="xMidYMid" />
  <image preserveAspectRatio="meet" />
</svg>`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 2,
			col: 31,
			raw: 'xMidYMid meet',
			message: 'It is the default value',
		},
		{
			severity: 'warning',
			line: 3,
			col: 31,
			raw: 'xMidYMid   meet',
			message: 'It is the default value',
		},
		{
			severity: 'warning',
			line: 4,
			col: 31,
			raw: ' xMidYMid meet ',
			message: 'It is the default value',
		},
		{
			severity: 'warning',
			line: 5,
			col: 31,
			raw: 'XMIDYMID MEET',
			message: 'It is the default value',
		},
	]);
});

test('[no-default-value-valid-001] Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
});

test('[no-default-value-invalid-003] The `as` attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<x-canvas as="canvas" width="300" height="150"></x-canvas>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 30,
			raw: '300',
			message: 'It is the default value',
		},
		{
			severity: 'warning',
			line: 1,
			col: 43,
			raw: '150',
			message: 'It is the default value',
		},
	]);
});

describe('fix', () => {
	test('[no-default-value-fix-001] remove default value attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<canvas width="300" height="150"></canvas>', undefined, true);
		expect(fixedCode).toBe('<canvas></canvas>');
	});
});

describe('fix with parsers', () => {
	test('[no-default-value-fix-002] fix: Pug remove default value', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'input(type="text")',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		// Empty parentheses remain after removing the only attribute in Pug
		expect(fixedCode).toBe('input()');
	});
});
