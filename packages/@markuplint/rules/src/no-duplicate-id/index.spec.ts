import type { Pretender, PretenderAttr, PretenderContent, Slot } from '@markuplint/ml-config';

import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-id-001] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"><p id="a"></p></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The value of the "id" attribute is duplicated',
			line: 1,
			col: 16,
			raw: 'id="a"',
		},
	]);
});

test('[no-duplicate-id-002] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-id-003] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="a"></div><div id="a"></div>');
	expect(violations.length).toBe(2);
});

test('[no-duplicate-id-004] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="b"></div><div id="c"></div>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-id-005] in Vue', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<template>
	<div v-if="bool"><span :id="uuid"></span></div>
	<div v-else><span :id="uuid"></span></div>
</template>`,
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});

describe('the id is unique in a tree: the content of a template and a declarative shadow root are trees of their own', () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };

	test('[no-duplicate-id-006] an id in a template and a declarative shadow root is not a duplicate', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>t</title></head>
<body>
<div id="a"></div>
<template><div id="a"></div></template>
<div id="b"></div>
<div><template shadowrootmode="open"><div id="b"></div></template></div>
</body>
</html>`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-007] a duplicate in the content of one template is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div id="a"></div><div id="a"></div></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 34,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-008] a duplicate in one declarative shadow root is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><p id="a"></p><p id="a"></p></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 55,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-009] the same id in two templates is not a duplicate', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><p id="a"></p></template><template><p id="a"></p></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-010] a template in a template is a tree of its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><p id="a"></p><template><p id="a"></p></template></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-011] a template whose shadow root is not attached is an element of its tree', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div id="a"></div><div><template shadowrootmode="open"></template><template shadowrootmode="open" id="a"></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 99,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-012] the id of a template that is in no tree does not count', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div id="a"></div><div><template shadowrootmode="open" id="a"></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-013] the ids are compared after the character references are resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="&#97;"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 24,
				raw: 'id="&#97;"',
			},
		]);
	});

	test('[no-duplicate-id-014] the children of a template of Vue are in the tree of the document', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div id="a"></div><template><div id="a"></div></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 44,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-015] the children of a template of React are in the tree of the document', async () => {
		const { violations } = await mlRuleTest(rule, '<><div id="a" /><template><div id="a" /></template></>', react);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 32,
				raw: 'id="a"',
			},
		]);
	});
});

/**
 * What a pretender declares is rendered by the component, so its ids count in the tree of the
 * pretended element.
 */
describe('an element that a pretender declares', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
	const idOf = (id: string | { readonly dynamic: true }): PretenderAttr[] => [{ name: 'id', value: id }];
	const heading = (contents: readonly PretenderContent[]): Pretender => ({
		selector: 'Heading',
		as: { element: 'div', contents },
	});
	const h2 = (id: string | { readonly dynamic: true }): PretenderContent => ({ element: 'h2', attrs: idOf(id) });
	const duplicated = (col: number, raw: string) => ({
		severity: 'error',
		message: 'The value of the "id" attribute is duplicated',
		line: 1,
		col,
		raw,
	});

	test('[no-duplicate-id-016] a declared id that repeats one of the usage site is reported on the component', async () => {
		const { violations } = await mlRuleTest(rule, '<><p id="t" /><Heading>Q</Heading></>', {
			...jsx,
			pretenders: [heading([h2('t'), { slot: true }])],
		});
		expect(violations).toStrictEqual([duplicated(15, '<Heading>')]);
	});

	test('[no-duplicate-id-017] one pretender used twice renders its declared id twice', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><Heading>R</Heading></>', {
			...jsx,
			pretenders: [heading([h2('t'), { slot: true }])],
		});
		expect(violations).toStrictEqual([duplicated(23, '<Heading>')]);
	});

	test('[no-duplicate-id-018] a declared id that is not known is not compared', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><Heading>R</Heading></>', {
			...jsx,
			pretenders: [heading([h2({ dynamic: true }), { slot: true }])],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-019] a declared id is compared in the order the component renders it: after the children given', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading><p id="t" /></Heading></>', {
			...jsx,
			pretenders: [heading([{ slot: true }, h2('t')])],
		});
		expect(violations).toStrictEqual([duplicated(3, '<Heading>')]);
	});

	test('[no-duplicate-id-020] a declared id that is before the children given is the first, so the child is the one reported', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading><p id="t" /></Heading></>', {
			...jsx,
			pretenders: [heading([h2('t'), { slot: true }])],
		});
		expect(violations).toStrictEqual([duplicated(15, 'id="t"')]);
	});

	test('[no-duplicate-id-021] the declared elements of the wrapper of a slot and of several slots are compared', async () => {
		const slots: Slot[] = [
			{ element: 'p', attrs: idOf('a'), contents: [{ element: 'i', attrs: idOf('b') }, { slot: true }] },
			{ element: 'section', attrs: idOf('c') },
		];
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading><i id="a" /><i id="b" /><i id="c" /></>', {
			...jsx,
			pretenders: [{ selector: 'Heading', as: { element: 'div', slots } }],
		});
		expect(violations).toStrictEqual([
			duplicated(26, 'id="a"'),
			duplicated(38, 'id="b"'),
			duplicated(50, 'id="c"'),
		]);
	});

	test('[no-duplicate-id-022] a declared element in no tree of the document is not compared with the document', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template><Heading>Q</Heading></template></div><p id="t"></p>',
			{ pretenders: [heading([h2('t'), { slot: true }])] },
		);
		expect(violations).toStrictEqual([]);
		// The pretender applies to `Heading` of this parser: the same markup outside the template is a duplicate,
		// of the declared id that comes first
		const outside = await mlRuleTest(rule, '<div><Heading>Q</Heading></div><p id="t"></p>', {
			pretenders: [heading([h2('t'), { slot: true }])],
		});
		expect(outside.violations).toStrictEqual([duplicated(35, 'id="t"')]);
	});

	test('[no-duplicate-id-023] two declared elements of one pretender with the same id are a duplicate', async () => {
		const { violations } = await mlRuleTest(rule, '<><Heading>Q</Heading></>', {
			...jsx,
			pretenders: [heading([h2('t'), { slot: true }, { element: 'h3', attrs: idOf('t') }])],
		});
		expect(violations).toStrictEqual([duplicated(3, '<Heading>')]);
	});

	test('[no-duplicate-id-024] an id that the usage site gives to both the component and a wrapper that inherits its attributes is rendered twice', async () => {
		const { violations } = await mlRuleTest(rule, '<><Comp id="a" /></>', {
			...jsx,
			pretenders: [
				{
					selector: 'Comp',
					as: { element: 'div', inheritAttrs: true, slots: [{ element: 'p', inheritAttrs: true }] },
				},
			],
		});
		expect(violations).toStrictEqual([duplicated(3, '<Comp id="a" />')]);
	});

	test('[no-duplicate-id-025] an id that only the wrapper inherits is rendered once', async () => {
		const { violations } = await mlRuleTest(rule, '<><Comp id="a" /></>', {
			...jsx,
			pretenders: [
				{
					selector: 'Comp',
					as: { element: 'div', slots: [{ element: 'p', inheritAttrs: true }] },
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-026] a declared duplicate is reported at the start tag of the component, whatever its lines', async () => {
		const { violations } = await mlRuleTest(
			rule,
			['<>', '<p id="t" />', '<Heading', '  className="x">Q</Heading>', '</>'].join('\n'),
			{ ...jsx, pretenders: [heading([h2('t'), { slot: true }])] },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 3,
				col: 1,
				raw: '<Heading\n  className="x">',
			},
		]);
	});
});

describe('of two `id` attributes of one element, the one that the element has', () => {
	const jsxParser = { parser: { '.*': '@markuplint/jsx-parser' } };
	const message = 'The value of the "id" attribute is duplicated';

	test('[no-duplicate-id-027] the HTML parser keeps the first: the second is no id', async () => {
		expect((await mlRuleTest(rule, '<div id="a" id="b"></div><div id="b"></div>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<div id="a" id="a"></div>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<div id="a" id="b"></div><div id="a"></div>')).violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 31, message, raw: 'id="a"' },
		]);
	});

	test('[no-duplicate-id-028] JSX keeps the last', async () => {
		expect(
			(await mlRuleTest(rule, '<><div id="a" id="b" /><div id="a" /></>', jsxParser)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<><div id="a" id="b" /><div id="b" /></>', jsxParser)).violations,
		).toStrictEqual([{ severity: 'error', line: 1, col: 29, message, raw: 'id="b"' }]);
	});

	test('[no-duplicate-id-029] the id is the value with its character references decoded', async () => {
		expect((await mlRuleTest(rule, '<div id="a&amp;b"></div><div id="a&b"></div>')).violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 30, message, raw: 'id="a&b"' },
		]);
	});
});
