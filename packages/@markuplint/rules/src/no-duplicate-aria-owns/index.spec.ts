import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-aria-owns-001] each element has one owner', async () => {
	expect(
		(await mlRuleTest(rule, '<div aria-owns="a"></div><div aria-owns="b"></div><p id="a"></p><p id="b"></p>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-002] an ID listed twice in one aria-owns is one owner', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="a a"></div><p id="a"></p>')).violations).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-003] an ID that no element has is left to no-refer-to-non-existent-id', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="a"></div><div aria-owns="a"></div>')).violations).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-004] an ID is resolved in the tree of the aria-owns', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div aria-owns="a"></div><p id="a"></p><template><div aria-owns="a"></div><p id="a"></p></template>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-005] a dynamic value is not judged', async () => {
	expect(
		(
			await mlRuleTest(rule, '<><div aria-owns="a"></div><div aria-owns={owns}></div><p id="a"></p></>', {
				parser: { '.*': '@markuplint/jsx-parser' },
			})
		).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-006] a later aria-owns that lists an ID an earlier one lists', async () => {
	expect(
		(await mlRuleTest(rule, '<div aria-owns="a"></div><div aria-owns="b a"></div><p id="a"></p><p id="b"></p>'))
			.violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "a" ID is already referred to by the "aria-owns" of another element',
			raw: 'a',
		},
	]);
});

test('[no-duplicate-aria-owns-007] with locale ja', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div aria-owns="a"></div><div aria-owns="a"></div><p id="a"></p>',
				undefined,
				false,
				'ja',
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 42,
			message: 'ID「a」はすでに別の要素のaria-owns属性で参照されています',
			raw: 'a',
		},
	]);
});

test('[no-duplicate-aria-owns-008] an element that lists its own ID is not an owner of it', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="a"></div><div aria-owns="a"></div>')).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-009] an id is read with its character references decoded', async () => {
	expect(
		(await mlRuleTest(rule, '<div aria-owns="x"></div><div aria-owns="&#120;"></div><span id="x"></span>'))
			.violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 42,
			message: 'The "x" ID is already referred to by the "aria-owns" of another element',
			raw: '&#120;',
		},
	]);
});

test('[no-duplicate-aria-owns-010] the earlier aria-owns may be one of an element that a component renders', async () => {
	const { violations } = await mlRuleTest(rule, '<><List /><div aria-owns="i"></div><div id="i"></div></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'List',
				as: { element: 'div', contents: [{ element: 'div', attrs: [{ name: 'aria-owns', value: 'i' }] }] },
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The "i" ID is already referred to by the "aria-owns" of another element',
			raw: 'i',
		},
	]);
});

test('[no-duplicate-aria-owns-011] two aria-owns that refer to an element a component renders', async () => {
	const { violations } = await mlRuleTest(rule, '<><div aria-owns="i"></div><div aria-owns="i"></div><Item /></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'Item',
				as: { element: 'div', contents: [{ element: 'div', attrs: [{ name: 'id', value: 'i' }] }] },
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 44,
			message: 'The "i" ID is already referred to by the "aria-owns" of another element',
			raw: 'i',
		},
	]);
});
