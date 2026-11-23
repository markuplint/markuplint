import { mlRuleTest } from 'markuplint';
import { expect, test } from 'vitest';

import rule from './index.js';

test('[no-ambiguous-navigable-target-names-001] _blank', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_blank"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="blank"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-002] _self', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_self"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="self"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_self"?',
			raw: 'self',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-003] _parent', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_parent"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="parent"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_parent"?',
			raw: 'parent',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-004] _top', async () => {
	expect((await mlRuleTest(rule, '<iframe src="path/to" name="_top"></iframe>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<iframe src="path/to" name="top"></iframe>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 29,
			message: "Don't use an ambiguous navigable target name",
			raw: 'top',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-005] _foo (invalid keyword)', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_foo"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="foo"></a>')).violations.length).toBe(0);
});

test('[no-ambiguous-navigable-target-names-006] the Japanese message has no article', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="path/to" target="blank"></a>', undefined, false, 'ja');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: '曖昧なナビゲート可能なターゲット名を使用しないでください。「_blank」ではありませんか？',
			raw: 'blank',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-007] an upper-case name is the attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="path/to" TARGET="blank"></a>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-008] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<a href="path/to" TARGET="blank"></a>', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
	const lower = await mlRuleTest(rule, '<a href="path/to" target="blank"></a>', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-009] an upper-case name on an svg a element is not target in JSX, and is in HTML', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<svg><a href="path/to" TARGET="blank"></a></svg>', { parser })).violations,
	).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const lower = await mlRuleTest(rule, '<svg><a href="path/to" target="blank"></a></svg>', { parser });
	expect(lower.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 32,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);

	// The HTML parser folds the name, so the upper-case one is the attribute
	const html = await mlRuleTest(rule, '<svg><a href="path/to" TARGET="blank"></a></svg>');
	expect(html.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 32,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-010] a literal is judged as the string is', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={"blank"}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			message: 'Don\'t use an ambiguous navigable target name. Did you mean "_blank"?',
			raw: '"blank"',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-011] code that is not a literal is not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={cond}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-ambiguous-navigable-target-names-012] an attribute that the framework does not output is not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={null}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
