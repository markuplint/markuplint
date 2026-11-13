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

const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
const svelte = { parser: { '.*': '@markuplint/svelte-parser' }, specs: { '.*': '@markuplint/svelte-spec' } };
const alpine = { parser: { '.*': '@markuplint/alpine-parser' }, specs: { '.*': '@markuplint/alpine-spec' } };
const htmx = { specs: { '.*': '@markuplint/htmx-spec' } };

/**
 * A violation of this rule on line 1.
 */
function duplicated(col: number, raw: string) {
	return { severity: 'error', line: 1, col, raw, message: 'The attribute name is duplicated' };
}

/**
 * The compiler of each framework is the source of the expectations of the tests below
 * (`@vue/compiler-dom` 3.5.45, `svelte` 5.57.3): it tells two spellings that it keeps both of from those
 * it reports (Vue and Svelte) or drops one of (Vue), and Alpine and htmx read the attributes that the HTML
 * parser of the browser makes.
 */
describe('directives are compared by the name that the framework keeps', () => {
	test('[no-duplicate-attr-issue-4612-001] Vue: listeners that differ in a modifier are two listeners', async () => {
		const html = [
			'<button type="button" @keydown.enter="a" @keydown.space="b">x</button>',
			'<button type="button" @click.stop="a" @keydown.enter="a" @keydown.space="b">y</button>',
			'<button type="button" @click="a" @keydown.enter.stop.prevent="a" @keydown.space.stop.prevent="b">z</button>',
		].join('');
		expect((await mlRuleTest(rule, `<template>${html}</template>`, vue)).violations).toStrictEqual([]);
	});

	test('[no-duplicate-attr-issue-4612-002] Vue: v-on and @, and the order of modifiers, are not repeats', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><button v-on:keydown.enter="a" @keydown.enter="b">x</button></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><button @click.stop.prevent="a" @click.prevent.stop="b">x</button></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<template><button @click="a" v-on:click="b">x</button></template>', vue))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-issue-4612-003] Vue: the same spelling of a listener is a repeat', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><button @keydown.enter.stop="a" @keydown.enter.stop="b">x</button></template>',
			vue,
		);
		expect(violations).toStrictEqual([duplicated(43, '@keydown.enter.stop')]);
	});

	test('[no-duplicate-attr-issue-4612-004] Alpine: listeners that differ in a modifier or a spelling are two', async () => {
		for (const html of [
			'<button @keydown.enter="a" @keydown.space="b">x</button>',
			'<button @click="a" x-on:click="b">x</button>',
			'<button onclick="a" @click="b">x</button>',
		]) {
			expect((await mlRuleTest(rule, html, alpine)).violations, html).toStrictEqual([]);
		}
	});

	test('[no-duplicate-attr-issue-4612-005] htmx: hx-on:click and hx-on-click are two listeners', async () => {
		for (const html of [
			'<button hx-on:click="a" hx-on-click="b">x</button>',
			'<button onclick="a" hx-on:click="b">x</button>',
		]) {
			expect((await mlRuleTest(rule, html, htmx)).violations, html).toStrictEqual([]);
		}
	});

	test('[no-duplicate-attr-issue-4612-006] Alpine and htmx: the same spelling of a listener is a repeat', async () => {
		expect(
			(await mlRuleTest(rule, '<button @keydown.enter="a" @keydown.enter="b">x</button>', alpine)).violations,
		).toStrictEqual([duplicated(28, '@keydown.enter')]);
		expect(
			(await mlRuleTest(rule, '<button hx-on:click="a" hx-on:click="b">x</button>', htmx)).violations,
		).toStrictEqual([duplicated(25, 'hx-on:click')]);
	});

	test('[no-duplicate-attr-issue-4613-001] Vue: the case of a listener is kept', async () => {
		expect(
			(await mlRuleTest(rule, '<template><button @keydown="a" @KEYDOWN="b">x</button></template>', vue))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-issue-4613-002] Vue: my-event and myEvent of a component are not a repeat', async () => {
		expect(
			(await mlRuleTest(rule, '<template><Foo @my-event="a" @myEvent="b" /></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-issue-4613-003] Svelte: the case of a listener is kept', async () => {
		expect(
			(await mlRuleTest(rule, '<button on:click={a} on:CLICK={b}>x</button>', svelte)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-issue-4613-004] Alpine: the HTML parser folds the case, so it is a repeat', async () => {
		expect((await mlRuleTest(rule, '<button @click="a" @CLICK="b">x</button>', alpine)).violations).toStrictEqual([
			duplicated(20, '@CLICK'),
		]);
	});

	test('[no-duplicate-attr-parser-007] Svelte: any number of the same on: or use:', async () => {
		for (const html of [
			'<button on:click={a} on:click={b}>x</button>',
			'<div use:tooltip={a} use:tooltip={b}>x</div>',
		]) {
			expect((await mlRuleTest(rule, html, svelte)).violations, html).toStrictEqual([]);
		}
	});

	test('[no-duplicate-attr-parser-008] Svelte: class: and style: are not a repeat of another name or of the attribute', async () => {
		for (const html of [
			'<div class:foo class:bar></div>',
			'<div class="a" class:foo></div>',
			'<div style:color="a" style:background="b"></div>',
			'<div style="a" style:color="b"></div>',
		]) {
			expect((await mlRuleTest(rule, html, svelte)).violations, html).toStrictEqual([]);
		}
	});

	test('[no-duplicate-attr-parser-009] Vue: :class twice is a repeat, :class and v-bind:class are not', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div :class="a" :class="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(27, ':class')]);
		expect(
			(await mlRuleTest(rule, '<template><div :class="a" v-bind:class="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-010] Vue: .prop and .attr bind a different key from the attribute', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div .id="a" :id.prop="b" v-bind:id.prop="c"></div></template>', vue))
				.violations,
		).toStrictEqual([duplicated(24, ':id.prop'), duplicated(37, 'v-bind:id.prop')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id.attr="a" v-bind:id.attr="b"></div></template>', vue))
				.violations,
		).toStrictEqual([duplicated(29, 'v-bind:id.attr')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id.prop.attr="a" :id.attr.prop="b"></div></template>', vue))
				.violations,
		).toStrictEqual([duplicated(34, ':id.attr.prop')]);
		expect(
			(await mlRuleTest(rule, '<template><div .id="a" id="b" :id.prop="c" :id="d"></div></template>', vue))
				.violations,
		).toStrictEqual([duplicated(31, ':id.prop'), duplicated(44, ':id')]);
	});

	test('[no-duplicate-attr-parser-011] Vue: .camel binds the camelCase name, and a modifier it does not know is dropped', async () => {
		expect(
			(await mlRuleTest(rule, '<template><svg :view-box.camel="a" :viewBox="b"></svg></template>', vue))
				.violations,
		).toStrictEqual([duplicated(36, ':viewBox')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id.foo="a" :id="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(28, ':id')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id.foo="a" :id.foo="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(28, ':id.foo')]);
	});

	test('[no-duplicate-attr-parser-012] Alpine: :class twice is a repeat, as the HTML parser keeps the first', async () => {
		expect((await mlRuleTest(rule, '<div :class="a" :class="b"></div>', alpine)).violations).toStrictEqual([
			duplicated(17, ':class'),
		]);
	});

	test('[no-duplicate-attr-parser-013] Svelte: any number of bind:this', async () => {
		expect((await mlRuleTest(rule, '<div bind:this={a} bind:this={b}>x</div>', svelte)).violations).toStrictEqual(
			[],
		);
	});

	test('[no-duplicate-attr-parser-015] Vue: class and style that Vue merges stay merged with a modifier', async () => {
		for (const html of [
			'<div class="a" :class.foo="b"></div>',
			'<div style="a" :style.camel="b"></div>',
			'<div :class="a" :class.foo="b"></div>',
			'<div :class.foo="a" :class.bar="b"></div>',
			'<div :class.camel="a" :class="b"></div>',
		]) {
			expect((await mlRuleTest(rule, `<template>${html}</template>`, vue)).violations, html).toStrictEqual([]);
		}
		expect(
			(await mlRuleTest(rule, '<template><div :class.foo="a" :class.foo="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(31, ':class.foo')]);
	});

	test('[no-duplicate-attr-parser-016] Vue: a dynamic argument is never keyed by the name that it resolves to', async () => {
		for (const html of [
			'<div .[x]="a" :[x].prop="b"></div>',
			'<div :[a]="x" :[b]="y"></div>',
			'<div :[a].prop="x" :[b].prop="y"></div>',
		]) {
			expect((await mlRuleTest(rule, `<template>${html}</template>`, vue)).violations, html).toStrictEqual([]);
		}
		expect(
			(await mlRuleTest(rule, '<template><div .[x]="a" .[x]="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(25, '.[x]')]);
	});

	test('[no-duplicate-attr-parser-017] Vue: an empty modifier is no modifier', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div :id.="a" :id="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(25, ':id')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id..x="a" :id="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(27, ':id')]);
		expect(
			(await mlRuleTest(rule, '<template><div .id.="a" :id.prop="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(25, ':id.prop')]);
		expect(
			(await mlRuleTest(rule, '<template><div class="a" :class.="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-018] Vue: a component folds .camel to the prop that the other spelling is', async () => {
		expect(
			(await mlRuleTest(rule, '<template><Foo :my-prop.camel="a" :myProp="b" /></template>', vue)).violations,
		).toStrictEqual([duplicated(35, ':myProp')]);
	});

	test('[no-duplicate-attr-parser-019] Vue: the generic directives and dynamic names are keyed by the written name', async () => {
		expect(
			(await mlRuleTest(rule, '<template><input v-model="a" v-model="b"></template>', vue)).violations,
		).toStrictEqual([duplicated(30, 'v-model')]);
		expect(
			(await mlRuleTest(rule, '<template><div :[x]="a" :[x]="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(25, ':[x]')]);
		expect(
			(await mlRuleTest(rule, '<template><div v-on:[x]="a" @[x]="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<template><div :style="a" :style="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(27, ':style')]);
	});

	test('[no-duplicate-attr-parser-020] htmx: the spellings of an event are each their own', async () => {
		expect(
			(await mlRuleTest(rule, '<button hx-on::foo="a" hx-on:htmx:foo="b" hx-on-htmx-foo="c">x</button>', htmx))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-021] Svelte: a modifier of on: does not make another event', async () => {
		expect(
			(await mlRuleTest(rule, '<button on:click={a} on:click|once={b}>x</button>', svelte)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-022] Astro: a directive that the parser makes is a repeat by its name', async () => {
		const astro = { parser: { '.*': '@markuplint/astro-parser' } };
		expect((await mlRuleTest(rule, '<Foo client:load client:load />', astro)).violations).toStrictEqual([
			duplicated(18, 'client:load'),
		]);
		expect((await mlRuleTest(rule, '<Foo client:load client:idle />', astro)).violations).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-023] Vue: a directive without an argument is a repeat by its name, and the case of a listener is kept', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div v-bind="a" v-bind="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(27, 'v-bind')]);
		expect(
			(await mlRuleTest(rule, '<template><div v-on="a" v-on="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(25, 'v-on')]);
		expect(
			(await mlRuleTest(rule, '<template><div v-bind="a" :id="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<template><div @click="a" @Click="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[no-duplicate-attr-parser-014] Vue: the key of .camel is folded as an attribute on an HTML element, the key of .prop is not', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div :view-box.camel="a" :viewBox="b"></div></template>', vue))
				.violations,
		).toStrictEqual([duplicated(36, ':viewBox')]);
		expect(
			(await mlRuleTest(rule, '<template><div :Id.foo="a" :id="b"></div></template>', vue)).violations,
		).toStrictEqual([duplicated(28, ':id')]);
		expect(
			(await mlRuleTest(rule, '<template><div :id.prop="a" :ID.prop="b"></div></template>', vue)).violations,
		).toStrictEqual([]);
	});
});
