import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

function templatesOf(code: string) {
	return parser
		.parse(code)
		.nodeList.flatMap(node => (node.type === 'starttag' && node.nodeName === 'template' ? [node] : []))
		.map(node => [node.renderedAway, node.slotTarget]);
}

/**
 * Vue's compiler renders a `<template>` that has `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` away:
 * its children are rendered in its place. A `<template>` without one of them stays a `template` element.
 * The parser says so (`MLASTElement#renderedAway`) so that it holds without `@markuplint/vue-spec`.
 */
describe('A template that Vue renders away', () => {
	test.each([
		['v-if', '<template v-if="a"></template>'],
		['v-else-if', '<template v-else-if="a"></template>'],
		['v-else', '<template v-else></template>'],
		['v-for', '<template v-for="i in xs"></template>'],
		['v-slot', '<template v-slot></template>'],
		['v-slot:name', '<template v-slot:name></template>'],
		['#name', '<template #name></template>'],
		['#default', '<template #default></template>'],
		['#[dynamic]', '<template #[name]></template>'],
	])('%s', (_, template) => {
		expect(templatesOf(`<template>${template}</template>`)[0]?.[0]).toBe(true);
	});

	test.each([
		['no directive', '<template></template>'],
		['v-show', '<template v-show="a"></template>'],
		['v-bind', '<template :id="a"></template>'],
		['an attribute', '<template id="a"></template>'],
	])('a template with %s stays an element', (_, template) => {
		expect(templatesOf(`<template>${template}</template>`)).toStrictEqual([[false, undefined]]);
	});

	test('a template of v-if and v-slot is rendered away', () => {
		expect(templatesOf('<template><template #default v-if="a"></template></template>')).toStrictEqual([
			[true, 'default'],
		]);
	});

	test('a component that is written Template is not a template, so it is not rendered away', () => {
		const nodes = parser.parse('<template><Template v-if="a"></Template></template>').nodeList;
		expect(nodes.flatMap(node => (node.type === 'starttag' ? [node.renderedAway] : []))).toStrictEqual([false]);
	});

	test.each([
		['an element with v-if', '<div v-if="a"></div>'],
		['a component with v-slot', '<List v-slot="{ a }"></List>'],
	])('%s is not a template, so it does not say it', (_, element) => {
		const nodes = parser.parse(`<template>${element}</template>`).nodeList;
		expect(
			nodes.flatMap(node => (node.type === 'starttag' ? [[node.renderedAway, node.slotTarget]] : [])),
		).toStrictEqual([[undefined, undefined]]);
	});
});

describe('The slot that a v-slot template passes its children to', () => {
	test.each([
		['v-slot', '<template v-slot></template>', 'default'],
		['v-slot:default', '<template v-slot:default></template>', 'default'],
		['#default', '<template #default></template>', 'default'],
		['v-slot:item', '<template v-slot:item="{ a }"></template>', 'item'],
		['#item', '<template #item></template>', 'item'],
		['#[name]', '<template #[name]></template>', null],
		['v-slot:[name]', '<template v-slot:[name]></template>', null],
	])('%s', (_, template, target) => {
		expect(templatesOf(`<template>${template}</template>`)).toStrictEqual([[true, target]]);
	});

	test('a template that has no v-slot has no target', () => {
		expect(templatesOf('<template><template v-if="a"></template></template>')).toStrictEqual([[true, undefined]]);
	});
});
