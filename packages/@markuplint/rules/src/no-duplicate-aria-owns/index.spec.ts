import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-aria-owns-valid-001] each element has one owner', async () => {
	expect(
		(await mlRuleTest(rule, '<div aria-owns="a"></div><div aria-owns="b"></div><p id="a"></p><p id="b"></p>'))
			.violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-valid-002] an ID listed twice in one aria-owns is one owner', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="a a"></div><p id="a"></p>')).violations).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-valid-003] an ID that no element has is left to no-refer-to-non-existent-id', async () => {
	expect((await mlRuleTest(rule, '<div aria-owns="a"></div><div aria-owns="a"></div>')).violations).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-valid-004] an ID is resolved in the tree of the aria-owns', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div aria-owns="a"></div><p id="a"></p><template><div aria-owns="a"></div><p id="a"></p></template>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-valid-005] a dynamic value is not judged', async () => {
	expect(
		(
			await mlRuleTest(rule, '<><div aria-owns="a"></div><div aria-owns={owns}></div><p id="a"></p></>', {
				parser: { '.*': '@markuplint/jsx-parser' },
			})
		).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-aria-owns-invalid-001] a later aria-owns that lists an ID an earlier one lists', async () => {
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

test('[no-duplicate-aria-owns-invalid-002] with locale ja', async () => {
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

test('[no-duplicate-aria-owns-valid-006] an element that lists its own ID is not an owner of it', async () => {
	expect(
		(await mlRuleTest(rule, '<div id="a" aria-owns="a"></div><div aria-owns="a"></div>')).violations,
	).toStrictEqual([]);
});
