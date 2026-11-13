import type { MLParser } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * `childElements` is the child nodes that are elements, in tree order. The first and the last of it are
 * the first and the last child that is an element.
 *
 * @see https://dom.spec.whatwg.org/#dom-parentnode-children
 */
describe('MLParentNode#childElements', () => {
	test('an element that has two or more element children', () => {
		const div = createTestDocument('<div><p>a</p><em>b</em><span>c</span></div>').querySelector('div');
		expect(div?.childElements[0]?.localName).toBe('p');
		expect(div?.childElements.at(-1)?.localName).toBe('span');
	});

	test('an element that has one element child', () => {
		const div = createTestDocument('<div><p>a</p></div>').querySelector('div');
		expect(div?.childElements[0]?.localName).toBe('p');
		expect(div?.childElements.at(-1)?.localName).toBe('p');
	});

	test('an element that has no child', () => {
		const div = createTestDocument('<div></div>').querySelector('div');
		expect(div?.childElements).toHaveLength(0);
	});

	test('an element that has no element child', () => {
		const div = createTestDocument('<div>text<!-- comment --></div>').querySelector('div');
		expect(div?.childElements).toHaveLength(0);
	});

	test('an element whose element children are interleaved with text', () => {
		const div = createTestDocument('<div>x<p>a</p>y<span>b</span>z</div>').querySelector('div');
		expect([...(div?.childElements ?? [])].map(el => el.localName)).toStrictEqual(['p', 'span']);
	});
});

describe('MLParentNode#childElements on the other parent nodes', () => {
	test('a document: the document element, with a doctype before it and a comment after it', () => {
		const doc = createTestDocument('<!doctype html><html><head></head><body><p>a</p></body></html><!-- c -->');
		expect([...(doc?.childElements ?? [])].map(el => el.localName)).toStrictEqual(['html']);
	});

	test('a document of a fragment that has two or more elements at the top', () => {
		const doc = createTestDocument('<p>a</p>x<em>b</em><span>c</span>');
		expect([...(doc?.childElements ?? [])].map(el => el.localName)).toStrictEqual(['p', 'em', 'span']);
	});

	test('the content of a template element: a tree of its own', () => {
		const doc = createTestDocument('<template>x<p>a</p>y<span>b</span>z</template>');
		const content = doc.querySelector('template')?.content;
		expect([...(content?.childElements ?? [])].map(el => el.localName)).toStrictEqual(['p', 'span']);
	});

	test('an element whose only child is a template element: the template, not an element in its content', () => {
		const div = createTestDocument('<div><template><p>a</p><span>b</span></template></div>').querySelector('div');
		expect([...(div?.childElements ?? [])].map(el => el.localName)).toStrictEqual(['template']);
	});
});

/**
 * The children of an `each` block are the children of the element that has the block, as `MLNode#childNodes`
 * flattens it.
 */
describe('MLParentNode#childElements with an each block', () => {
	async function svelteParser(): Promise<MLParser> {
		return (await import('@markuplint/svelte-parser')).parser;
	}

	test('an element whose last element child is in an each block', async () => {
		const ul = createTestDocument(
			'<ul><li class="outside">a</li>{#each items as item}<li class="in-each">{item}</li>{/each}</ul>',
			{ parser: await svelteParser() },
		).querySelector('ul');
		expect(ul?.childElements[0]?.className).toBe('outside');
		expect(ul?.childElements.at(-1)?.className).toBe('in-each');
	});

	test('an element whose first element child is in an each block', async () => {
		const ul = createTestDocument(
			'<ul>{#each items as item}<li class="in-each">{item}</li>{/each}<li class="outside">a</li></ul>',
			{ parser: await svelteParser() },
		).querySelector('ul');
		expect(ul?.childElements[0]?.className).toBe('in-each');
		expect(ul?.childElements.at(-1)?.className).toBe('outside');
	});
});
