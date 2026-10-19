import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-attr-invalid-001] is test 1', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The attribute name is duplicated',
			line: 2,
			col: 26,
			raw: 'data-Attr',
		},
		{
			severity: 'error',
			message: 'The attribute name is duplicated',
			line: 2,
			col: 41,
			raw: 'data-attR',
		},
	]);
});

test('[no-duplicate-attr-invalid-002] is test 2', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<div
			data-attr="value"
			data-Attr='db'
			data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The attribute name is duplicated',
			line: 4,
			col: 4,
			raw: 'data-Attr',
		},
		{
			severity: 'error',
			message: 'The attribute name is duplicated',
			line: 5,
			col: 4,
			raw: 'data-attR',
		},
	]);
});

test('[no-duplicate-attr-invalid-003] is test 3', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/" SRC="/" >', undefined, false, 'ja');

	expect(violations.map(_ => _.message)).toStrictEqual(['属性名が重複しています']);
});

test('[no-duplicate-attr-invalid-004] nodeRules disable', async () => {
	const { violations } = await mlRuleTest(rule, '<div><span attr attr></span></div>', {
		nodeRule: [
			{
				selector: 'span',
				rule: false,
			},
		],
	});

	expect(violations.length).toStrictEqual(0);
});

test('[no-duplicate-attr-parser-001] Vue', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div attr v-bind:attr /></template>', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
		specs: {
			'.*': '@markuplint/vue-spec',
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The attribute name is duplicated',
			raw: 'v-bind:attr',
		},
	]);
});

test('[no-duplicate-attr-parser-002] Vue (exception)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><div class="foo" v-bind:class="bar" style="a: b;" :style="{c: d}" /></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);

	expect(violations.length).toBe(0);
});

test('[no-duplicate-attr-parser-003] React', async () => {
	const { violations } = await mlRuleTest(rule, '<div tabindex tabIndex />', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
	});

	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-attr-parser-004] Pug', async () => {
	expect(
		(
			await mlRuleTest(rule, '.hoge.hoge2.hoge3', {
				parser: {
					'.*': '@markuplint/pug-parser',
				},
			})
		).violations.length,
	).toBe(0);
	expect(
		(
			await mlRuleTest(rule, '.hoge(class="hoge2")&attributes({class: "hoge3"})', {
				parser: {
					'.*': '@markuplint/pug-parser',
				},
			})
		).violations.length,
	).toBe(0);
});

test('[no-duplicate-attr-parser-005] Svelte', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div class:selected="{isSelected}" class:focused="{isFocused}"></div>',
		{
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
		},
	);

	expect(violations.length).toBe(0);
});

test('[no-duplicate-attr-parser-006] Astro', async () => {
	const { violations } = await mlRuleTest(rule, '<div class:list="a" class="b"></div>', {
		parser: {
			'.*': '@markuplint/astro-parser',
		},
	});

	expect(violations.length).toBe(1);
});

describe('fix', () => {
	test('[no-duplicate-attr-fix-001] remove duplicate attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div class="a" class="b"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a"></div>');
	});

	test('[no-duplicate-attr-fix-002] remove duplicate boolean attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input disabled disabled />', undefined, true);
		expect(fixedCode).toBe('<input disabled />');
	});

	test('[no-duplicate-attr-fix-003] remove third duplicate attribute', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div data-attr="value" data-Attr=\'db\' data-attR=tr></div>',
			undefined,
			true,
		);
		expect(fixedCode).toBe('<div data-attr="value"></div>');
	});
});

describe('fix with parsers', () => {
	test('[no-duplicate-attr-fix-004] fix: Pug duplicate attr (no fix — Pug merges class attributes)', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'div(class="a" class="b")',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		// Pug parser merges duplicate class attributes, so no violation is detected
		expect(fixedCode).toBe('div(class="a" class="b")');
	});

	test('[no-duplicate-attr-fix-005] fix: Vue remove duplicate attr', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<template><div class="a" class="b"></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div class="a"></div></template>');
	});
});

test('[no-duplicate-attr-issue-4309-001] names that differ in case are one attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<div id ID></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			raw: 'ID',
			message: 'The attribute name is duplicated',
		},
	]);
});

test('[no-duplicate-attr-issue-4309-002] a custom element folds the name too', async () => {
	const { violations } = await mlRuleTest(rule, '<x-foo ID id></x-foo>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 11,
			raw: 'id',
			message: 'The attribute name is duplicated',
		},
	]);
});

test('[no-duplicate-attr-issue-4309-003] an HTML element in JSX folds the name, an SVG element does not', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const html = await mlRuleTest(rule, '<div id ID />', options);
	expect(html.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			raw: 'ID',
			message: 'The attribute name is duplicated',
		},
	]);
	const svgSame = await mlRuleTest(rule, '<svg id id />', options);
	expect(svgSame.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			raw: 'id',
			message: 'The attribute name is duplicated',
		},
	]);
	const svgDifferent = await mlRuleTest(rule, '<svg id ID />', options);
	expect(svgDifferent.violations).toStrictEqual([]);
});

test('[no-duplicate-attr-issue-4309-004] a prop of a component keeps its spelling', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const same = await mlRuleTest(rule, '<Foo fooBar fooBar />', options);
	expect(same.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			raw: 'fooBar',
			message: 'The attribute name is duplicated',
		},
	]);
	const different = await mlRuleTest(rule, '<Foo fooBar foobar />', options);
	expect(different.violations).toStrictEqual([]);
});

test('[no-duplicate-attr-issue-4309-005] U+212A KELVIN SIGN is not the letter k', async () => {
	const same = await mlRuleTest(rule, '<div k K></div>');
	expect(same.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			raw: 'K',
			message: 'The attribute name is duplicated',
		},
	]);
	const kelvin = String.fromCodePoint(8490);
	const different = await mlRuleTest(rule, `<div k ${kelvin}></div>`);
	expect(different.violations).toStrictEqual([]);
});

test('[no-duplicate-attr-issue-4309-006] Vue: class and :class are not duplicates, id and :id are', async () => {
	const options = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	expect(
		(await mlRuleTest(rule, '<template><div class="a" :class="b"></div></template>', options)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<template><div :class="b" class="a"></div></template>', options)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<template><div id="a" :id="b"></div></template>', options)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			raw: ':id',
			message: 'The attribute name is duplicated',
		},
	]);
});
