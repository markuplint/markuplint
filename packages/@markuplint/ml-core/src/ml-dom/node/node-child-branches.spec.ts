import type { MLNode } from './node.js';

import { ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

async function vue(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/vue-parser') });
}

async function svelte(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/svelte-parser') });
}

async function jsx(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/jsx-parser') });
}

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

/** An element is `name:text`, any other node is its `raw` */
function shape(patterns: Iterable<Iterable<MLNode<any, any>>>) {
	return [...patterns].map(pattern =>
		[...pattern].map(node => (node.is(node.ELEMENT_NODE) ? `${node.localName}:${node.textContent}` : node.raw)),
	);
}

function sorted(patterns: readonly (readonly string[])[]) {
	return patterns.map(pattern => pattern.join(' ')).toSorted();
}

describe('MLElement#isRenderedAway', () => {
	test.each([
		['v-if', '<template v-if="a"></template>', true],
		['v-else-if', '<template v-else-if="a"></template>', true],
		['v-else', '<template v-else></template>', true],
		['v-for', '<template v-for="i in xs"></template>', true],
		['#x', '<template #x></template>', true],
		['v-slot', '<template v-slot></template>', true],
		['v-show', '<template v-show="a"></template>', false],
		[':id', '<template :id="a"></template>', false],
		['no directive', '<template></template>', false],
	])('a template of Vue with %s', async (_, template, expected) => {
		const doc = await vue(`<template>${template}</template>`);
		const el = must(doc.nodeList.find(node => node.is(node.ELEMENT_NODE)));
		expect(el.is(el.ELEMENT_NODE) && el.isRenderedAway).toBe(expected);
	});

	test('is true for a fragment', async () => {
		const doc = await jsx('const a = <><div /></>;');
		const fragment = must(doc.nodeList.find(node => node.is(node.ELEMENT_NODE)));
		expect(fragment.is(fragment.ELEMENT_NODE) && fragment.isRenderedAway).toBe(true);
	});

	test('is false for an element that is not a template', async () => {
		const doc = await vue('<template><div v-if="a"></div></template>');
		expect(must(doc.querySelector('div')).isRenderedAway).toBe(false);
	});
});

describe('MLNode#childNodes with a template of v-for', () => {
	test('flattens the body of the loop into the parent, as the body of an each block is', async () => {
		const doc = await vue(
			'<template><ul><template v-for="i in xs"><li>a</li></template><li>b</li></ul></template>',
		);
		expect(shape([must(doc.querySelector('ul')).childNodes])).toStrictEqual([['li:a', 'li:b']]);
	});

	test('keeps a template of v-if, which is one of the branches of a condition', async () => {
		const doc = await vue('<template><ul><template v-if="a"><li>a</li></template><li>b</li></ul></template>');
		expect(shape([must(doc.querySelector('ul')).childNodes])).toStrictEqual([['template:a', 'li:b']]);
	});
});

describe('MLNode#conditionalChildNodes', () => {
	const table = (a: string, b: string) => `<template><table>${a}${b}<tr><td>1</td></tr></table></template>`;

	test('a chain of templates of v-if and v-else is a choice of one', async () => {
		const doc = await vue(
			table(
				'<template v-if="a"><caption>A</caption></template>',
				'<template v-else><caption>B</caption></template>',
			),
		);
		expect(shape(must(doc.querySelector('table')).conditionalChildNodes())).toStrictEqual([
			['caption:A', 'tr:1'],
			['caption:B', 'tr:1'],
		]);
	});

	test('a chain of elements of v-if and v-else is a choice of one, whitespace between them or not', async () => {
		const expected = [
			['caption:A', 'tr:1'],
			['caption:B', 'tr:1'],
		];
		const tight = await vue(table('<caption v-if="a">A</caption>', '<caption v-else>B</caption>'));
		expect(shape(must(tight.querySelector('table')).conditionalChildNodes())).toStrictEqual(expected);
		const loose = await vue(table('<caption v-if="a">A</caption>\n\t', '<caption v-else>B</caption>\n'));
		expect(shape(must(loose.querySelector('table')).conditionalChildNodes())).toStrictEqual(expected);
	});

	test('the branches of a chain with v-else-if are a choice of one, or of none without v-else', async () => {
		const open = await vue('<template><ul><li v-if="a">1</li><li v-else-if="b">2</li></ul></template>');
		expect(shape(must(open.querySelector('ul')).conditionalChildNodes())).toStrictEqual([['li:1'], ['li:2'], []]);
		const closed = await vue(
			'<template><ul><li v-if="a">1</li><li v-else-if="b">2</li><li v-else>3</li></ul></template>',
		);
		expect(shape(must(closed.querySelector('ul')).conditionalChildNodes())).toStrictEqual([
			['li:1'],
			['li:2'],
			['li:3'],
		]);
	});

	test('two chains that are written side by side are independent', async () => {
		const expected = ['', 'li:1', 'li:1 li:2', 'li:2'];
		const v = await vue('<template><ul><li v-if="a">1</li><li v-if="b">2</li></ul></template>');
		expect(sorted(shape(must(v.querySelector('ul')).conditionalChildNodes()))).toStrictEqual(expected);
		const s = await svelte('<ul>{#if a}<li>1</li>{/if}{#if b}<li>2</li>{/if}</ul>');
		expect(sorted(shape(must(s.querySelector('ul')).conditionalChildNodes()))).toStrictEqual(expected);
	});

	test('a chain of v-if of templates and a chain of elements are independent', async () => {
		const doc = await vue(
			'<template><ul><template v-if="a"><li>1</li></template><li v-if="b">2</li></ul></template>',
		);
		expect(sorted(shape(must(doc.querySelector('ul')).conditionalChildNodes()))).toStrictEqual([
			'',
			'li:1',
			'li:1 li:2',
			'li:2',
		]);
	});

	test('the nodes of a branch are one choice, not one choice each', async () => {
		const v = await vue('<template><dl><template v-if="a"><dt>t</dt><dd>d</dd></template></dl></template>');
		expect(shape(must(v.querySelector('dl')).conditionalChildNodes())).toStrictEqual([['dt:t', 'dd:d'], []]);
		const s = await svelte('<dl>{#if a}<dt>t</dt><dd>d</dd>{:else}<dt>u</dt><dd>e</dd>{/if}</dl>');
		expect(shape(must(s.querySelector('dl')).conditionalChildNodes())).toStrictEqual([
			['dt:t', 'dd:d'],
			['dt:u', 'dd:e'],
		]);
	});

	test('whitespace ends a group of blocks, so blocks of another kind written after it are another group', async () => {
		const s = await svelte('<ul>{#if a}<li>1</li>{/if}\n{#await p}<li>2</li>{/await}</ul>');
		expect(sorted(shape(must(s.querySelector('ul')).conditionalChildNodes()))).toStrictEqual(['li:1 li:2', 'li:2']);
	});

	test('a block of another kind starts another group even when nothing is between them', async () => {
		const s = await svelte('<ul>{#if a}<li>1</li>{/if}{#await p}<li>2</li>{/await}</ul>');
		expect(sorted(shape(must(s.querySelector('ul')).conditionalChildNodes()))).toStrictEqual(['li:1 li:2', 'li:2']);
	});

	test('a lone v-else is a chain of its own that renders, with no choice of none', async () => {
		const v = await vue('<template><ul><li v-else>1</li></ul></template>');
		expect(shape(must(v.querySelector('ul')).conditionalChildNodes())).toStrictEqual([['li:1']]);
	});

	test('a lone v-else-if may not render', async () => {
		const v = await vue('<template><ul><li v-else-if="a">1</li></ul></template>');
		expect(shape(must(v.querySelector('ul')).conditionalChildNodes())).toStrictEqual([['li:1'], []]);
	});

	test('a comment between the elements of a chain does not end it', async () => {
		const expected = [
			['caption:A', 'tr:1'],
			['caption:B', 'tr:1'],
		];
		const doc = await vue(
			'<template><table><caption v-if="a">A</caption><!-- c --><caption v-else>B</caption><tr><td>1</td></tr></table></template>',
		);
		expect(shape(must(doc.querySelector('table')).conditionalChildNodes())).toStrictEqual(expected);
		expect(shape(must(doc.querySelector('table')).alternativeChildNodes())).toStrictEqual(expected);
	});

	test('a comment after a chain is a node of its own', async () => {
		const doc = await vue('<template><ul><li v-if="a">1</li><!-- c --><li>2</li></ul></template>');
		expect(shape(must(doc.querySelector('ul')).alternativeChildNodes())).toStrictEqual([
			['li:1', '<!-- c -->', 'li:2'],
		]);
	});

	test('an element of v-for is not a choice', async () => {
		const doc = await vue('<template><ul><li v-for="i in xs">1</li></ul></template>');
		expect(shape(must(doc.querySelector('ul')).conditionalChildNodes())).toStrictEqual([['li:1']]);
	});
});

describe('MLNode#alternativeChildNodes', () => {
	test('a chain of elements with v-else is a choice of one', async () => {
		const doc = await vue(
			'<template><table><caption v-if="a">A</caption><caption v-else>B</caption><tr><td>1</td></tr></table></template>',
		);
		expect(shape(must(doc.querySelector('table')).alternativeChildNodes())).toStrictEqual([
			['caption:A', 'tr:1'],
			['caption:B', 'tr:1'],
		]);
	});

	test('an element of v-if alone is as written: the pattern in which none is rendered is not made', async () => {
		const doc = await vue('<template><ul><li v-if="a">1</li></ul></template>');
		expect(shape(must(doc.querySelector('ul')).alternativeChildNodes())).toStrictEqual([['li:1']]);
	});

	test('a template of v-if and a block stay as nodes', async () => {
		const v = await vue('<template><ul><template v-if="a"><li>1</li></template></ul></template>');
		expect(shape(must(v.querySelector('ul')).alternativeChildNodes())).toStrictEqual([['template:1']]);
		const s = await svelte('<ul>{#if a}<li>1</li>{/if}</ul>');
		expect(shape(must(s.querySelector('ul')).alternativeChildNodes())).toStrictEqual([['{#if a}']]);
	});

	test.each([
		// Six pairs make 64 patterns, which is the limit; the seventh is read as written
		[6, 64, 6],
		[7, 64, 8],
		[30, 64, 54],
	])('%i pairs of v-if and v-else make %i patterns of %i nodes at most', async (count, patterns, nodes) => {
		const pairs = Array.from({ length: count }, (_, i) => `<li v-if="a${i}">a</li><li v-else>b</li>`).join('');
		const doc = await vue(`<template><ul>${pairs}</ul></template>`);
		const ul = must(doc.querySelector('ul'));
		for (const made of [ul.alternativeChildNodes(), ul.conditionalChildNodes()]) {
			expect(made.length).toBe(patterns);
			expect(made.map(pattern => pattern.length)).toStrictEqual(Array.from({ length: patterns }, () => nodes));
		}
	});

	test('a v-else element after a template of v-if is a chain of its own, as the template is opaque', async () => {
		const doc = await vue(
			'<template><table><template v-if="a"><caption>A</caption></template><caption v-else>B</caption><tr><td>1</td></tr></table></template>',
		);
		expect(shape(must(doc.querySelector('table')).alternativeChildNodes())).toStrictEqual([
			['template:A', 'caption:B', 'tr:1'],
		]);
	});

	test('what follows chains past the limit stays after them', async () => {
		const pairs = Array.from({ length: 8 }, (_, i) => `<li v-if="a${i}">a</li><li v-else>b</li>`).join('');
		const doc = await vue(`<template><ul>${pairs}<!-- end --><li>end</li></ul></template>`);
		const patterns = shape(must(doc.querySelector('ul')).alternativeChildNodes());
		expect(patterns.map(pattern => pattern.slice(-2))).toStrictEqual(
			Array.from({ length: 64 }, () => ['<!-- end -->', 'li:end']),
		);
	});

	test('an element without a condition is as written', async () => {
		const doc = await vue('<template><ul><li>1</li><li>2</li></ul></template>');
		expect(shape(must(doc.querySelector('ul')).alternativeChildNodes())).toStrictEqual([['li:1', 'li:2']]);
	});
});

describe('The role of an element below what the framework renders away', () => {
	function roleOf(doc: Awaited<ReturnType<typeof vue>>, selector: string) {
		const el = must(doc.querySelector(selector));
		return getComputedRole(doc.specs, el, ARIA_RECOMMENDED_VERSION).role?.name ?? null;
	}

	test.each([
		['v-if', '<template v-if="a">'],
		['v-for', '<template v-for="i in xs">'],
		['v-slot', '<template #default>'],
	])('an implicit role that needs a parent is kept in a template of %s', async (_, open) => {
		const doc = await vue(`<template><ul>${open}<li>a</li></template></ul></template>`);
		expect(roleOf(doc, 'li')).toBe('listitem');
	});

	test.each([
		['v-if', '<template v-if="a">'],
		['v-for', '<template v-for="i in xs">'],
		['v-slot', '<template #default>'],
	])('an explicit role that needs a parent is kept in a template of %s', async (_, open) => {
		const doc = await vue(`<template><div role="menu">${open}<p role="menuitem">a</p></template></div></template>`);
		expect(roleOf(doc, 'p')).toBe('menuitem');
	});

	test.each([
		['v-show', '<template v-show="a">'],
		['a bound attribute', '<template :id="a">'],
		['no directive', '<template>'],
	])(
		'an explicit role that needs a parent is lost below a template with %s, which stays an element',
		async (_, open) => {
			const doc = await vue(
				`<template><div role="menu">${open}<p role="menuitem">a</p></template></div></template>`,
			);
			expect(roleOf(doc, 'p')).toBeNull();
		},
	);

	test('a fragment of JSX does not stop the parent', async () => {
		const doc = await jsx('const a = <div role="menu"><><p role="menuitem">a</p></></div>;');
		expect(roleOf(doc, 'p')).toBe('menuitem');
	});
});
