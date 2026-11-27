import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-circular-aria-owns-001] a chain that is not a cycle', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c"></div>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-circular-aria-owns-002] an element that lists its own child', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="c"><span id="c"></span></div>')).violations).toStrictEqual([]);
});

test('[no-circular-aria-owns-003] an ID that no element has', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="missing"></div>')).violations).toStrictEqual([]);
});

test('[no-circular-aria-owns-004] an element that lists its own ID', async () => {
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

test('[no-circular-aria-owns-005] an element that lists its ancestor', async () => {
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

test('[no-circular-aria-owns-006] every reference of a cycle is reported', async () => {
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

test('[no-circular-aria-owns-007] with locale ja', async () => {
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

test('[no-circular-aria-owns-008] reported under WAI-ARIA 1.2 as well', async () => {
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

test('[no-circular-aria-owns-009] a reference that closes a cycle once another cycle is broken', async () => {
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

test('[no-circular-aria-owns-010] a cycle may go through an element that a component renders', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id="a" aria-owns="b"></div><Item /></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'Item',
				as: {
					element: 'div',
					contents: [
						{
							element: 'div',
							attrs: [
								{ name: 'id', value: 'b' },
								{ name: 'aria-owns', value: 'a' },
							],
						},
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'Referring to the "b" ID from "aria-owns" makes a cycle',
			raw: 'b',
		},
	]);
});
