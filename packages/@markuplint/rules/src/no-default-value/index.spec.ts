import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('canvas', async () => {
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

test('svg|image', async () => {
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

test('Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
});
