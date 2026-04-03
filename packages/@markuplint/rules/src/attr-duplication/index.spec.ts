import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[attr-duplication-invalid-001] is test 1', async () => {
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

test('[attr-duplication-invalid-002] is test 2', async () => {
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

test('[attr-duplication-invalid-003] is test 3', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="/" SRC="/" >', undefined, false, 'ja');

	expect(violations.map(_ => _.message)).toStrictEqual(['属性名が重複しています']);
});

test('[attr-duplication-invalid-004] nodeRules disable', async () => {
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

test('[attr-duplication-parser-001] Vue', async () => {
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

test('[attr-duplication-parser-002] Vue (exception)', async () => {
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

test('[attr-duplication-parser-003] React', async () => {
	const { violations } = await mlRuleTest(rule, '<div tabindex tabIndex />', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
	});

	expect(violations).toStrictEqual([]);
});

test('[attr-duplication-parser-004] Pug', async () => {
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

test('[attr-duplication-parser-005] Svelte', async () => {
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

test('[attr-duplication-parser-006] Astro', async () => {
	const { violations } = await mlRuleTest(rule, '<div class:list="a" class="b"></div>', {
		parser: {
			'.*': '@markuplint/astro-parser',
		},
	});

	expect(violations.length).toBe(1);
});

describe('fix', () => {
	test('[attr-duplication-fix-001] remove duplicate attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div class="a" class="b"></div>', undefined, true);
		expect(fixedCode).toBe('<div class="a"></div>');
	});

	test('[attr-duplication-fix-002] remove duplicate boolean attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input disabled disabled />', undefined, true);
		expect(fixedCode).toBe('<input disabled />');
	});

	test('[attr-duplication-fix-003] remove third duplicate attribute', async () => {
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
	test('[attr-duplication-fix-004] fix: Pug duplicate attr (no fix — Pug merges class attributes)', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'div(class="a" class="b")',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		// Pug parser merges duplicate class attributes, so no violation is detected
		expect(fixedCode).toBe('div(class="a" class="b")');
	});

	test('[attr-duplication-fix-005] fix: Vue remove duplicate attr', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<template><div class="a" class="b"></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div class="a"></div></template>');
	});
});
