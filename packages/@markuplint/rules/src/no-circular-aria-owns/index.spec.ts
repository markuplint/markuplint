import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-circular-aria-owns-valid-001] a chain that is not a cycle', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c"></div>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-circular-aria-owns-valid-002] an element that lists its own child', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="c"><span id="c"></span></div>')).violations).toStrictEqual([]);
});

test('[no-circular-aria-owns-valid-003] an ID that no element has', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="missing"></div>')).violations).toStrictEqual([]);
});

test('[no-circular-aria-owns-invalid-001] an element that lists its own ID', async () => {
	expect((await mlRuleTest(rule, '<div id="a" aria-owns="a"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'Referring to the "a" ID from "aria-owns" makes a cycle',
			raw: 'a',
		},
	]);
});

test('[no-circular-aria-owns-invalid-002] an element that lists its ancestor', async () => {
	expect((await mlRuleTest(rule, '<div id="a"><span aria-owns="a"></span></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message: 'Referring to the "a" ID from "aria-owns" makes a cycle',
			raw: 'a',
		},
	]);
});

test('[no-circular-aria-owns-invalid-003] every reference of a cycle is reported', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="b"></div><div id="b" aria-owns="a"></div>')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'Referring to the "b" ID from "aria-owns" makes a cycle',
			raw: 'b',
		},
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'Referring to the "a" ID from "aria-owns" makes a cycle',
			raw: 'a',
		},
	]);
});

test('[no-circular-aria-owns-invalid-004] with locale ja', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="a"></div>', undefined, false, 'ja')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'aria-owns属性でID「a」を参照すると、所有関係が循環します',
			raw: 'a',
		},
	]);
});

test('[no-circular-aria-owns-invalid-005] reported under WAI-ARIA 1.2 as well', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div id="a" aria-owns="a"></div>', {
				ruleCommonSettings: { ariaVersion: '1.2' },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'Referring to the "a" ID from "aria-owns" makes a cycle',
			raw: 'a',
		},
	]);
});

test('[no-circular-aria-owns-invalid-006] a reference that closes a cycle once another cycle is broken', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="x"><div id="o" aria-owns="x"><span id="z" aria-owns="o"></span></div></div>'))
			.violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message: 'Referring to the "x" ID from "aria-owns" makes a cycle',
			raw: 'x',
		},
		{
			severity: 'error',
			line: 1,
			col: 63,
			message: 'Referring to the "o" ID from "aria-owns" makes a cycle',
			raw: 'o',
		},
	]);
});
