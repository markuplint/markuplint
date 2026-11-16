import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

/**
 * `v-if`, `v-else-if`, `v-else` and `v-for` are attributes of an element that Vue renders or leaves
 * out, so the element carries the behavior (`MLASTElement#blockBehavior`) instead of being wrapped in a
 * block: it has to stay an element for the attributes to be validated.
 */
function behaviorsOf(code: string) {
	return parser
		.parse(code)
		.nodeList.filter(node => node.type === 'starttag')
		.map(node => [node.nodeName, node.blockBehavior?.type ?? null, node.blockBehavior?.expression ?? null]);
}

describe('The behavior of an element that has a conditional directive', () => {
	test('v-if, v-else-if and v-else', () => {
		expect(
			behaviorsOf('<template><i v-if="a"></i><i v-else-if="b"></i><i v-else></i><b></b></template>').filter(
				([name]) => name !== 'template',
			),
		).toStrictEqual([
			['i', 'if', 'a'],
			['i', 'if:elseif', 'b'],
			['i', 'if:else', ''],
			['b', null, null],
		]);
	});

	test('v-for', () => {
		expect(
			behaviorsOf('<template><li v-for="x in xs"></li></template>').filter(([name]) => name !== 'template'),
		).toStrictEqual([['li', 'each', 'x in xs']]);
	});

	test('v-if wins over v-for on the same element, whichever is written first', () => {
		const names = (code: string) => behaviorsOf(code).filter(([name]) => name !== 'template');
		expect(names('<template><li v-for="x in xs" v-if="x.ok"></li></template>')).toStrictEqual([
			['li', 'if', 'x.ok'],
		]);
		expect(names('<template><li v-if="x.ok" v-for="x in xs"></li></template>')).toStrictEqual([
			['li', 'if', 'x.ok'],
		]);
	});

	test.each([
		['v-if=\'a === "x"\'', 'if', 'a === "x"'],
		['v-if=b', 'if', 'b'],
		['v-if', 'if', ''],
		['v-if.x="a"', 'if', 'a'],
		['v-else-if="b" v-for="x in xs"', 'if:elseif', 'b'],
	])('%s', (attrs, type, expression) => {
		expect(
			behaviorsOf(`<template><i ${attrs}></i></template>`).filter(([name]) => name !== 'template'),
		).toStrictEqual([['i', type, expression]]);
	});

	test.each([[':if="a"'], ['v-bind:for="x"'], ['#if'], ['data-if="a"']])(
		'%s is not a conditional directive',
		attrs => {
			expect(
				behaviorsOf(`<template><i ${attrs}></i></template>`).filter(([name]) => name !== 'template'),
			).toStrictEqual([['i', null, null]]);
		},
	);

	test('a directive that is not conditional leaves the element without a behavior', () => {
		expect(
			behaviorsOf('<template><i v-show="a" v-model="b" :c="d" @click="e"></i></template>').filter(
				([name]) => name !== 'template',
			),
		).toStrictEqual([['i', null, null]]);
	});

	test('v-if on a template element', () => {
		expect(behaviorsOf('<template><template v-if="a"></template></template>')).toStrictEqual([
			['template', 'if', 'a'],
		]);
	});
});
