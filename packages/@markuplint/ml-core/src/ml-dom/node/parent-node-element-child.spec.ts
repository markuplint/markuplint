import type { MLParser } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * The `firstElementChild` and `lastElementChild` getter steps return the first and the last child that is
 * an element, or null when there is none.
 *
 * @see https://dom.spec.whatwg.org/#dom-parentnode-firstelementchild
 * @see https://dom.spec.whatwg.org/#dom-parentnode-lastelementchild
 */
describe('MLParentNode#firstElementChild and #lastElementChild', () => {
	test('an element that has two or more element children', () => {
		const div = createTestDocument('<div><p>a</p><em>b</em><span>c</span></div>').querySelector('div');
		expect(div?.firstElementChild?.localName).toBe('p');
		expect(div?.lastElementChild?.localName).toBe('span');
	});

	test('an element that has one element child', () => {
		const div = createTestDocument('<div><p>a</p></div>').querySelector('div');
		expect(div?.firstElementChild?.localName).toBe('p');
		expect(div?.lastElementChild?.localName).toBe('p');
	});

	test('an element that has no child', () => {
		const div = createTestDocument('<div></div>').querySelector('div');
		expect(div?.firstElementChild).toBeNull();
		expect(div?.lastElementChild).toBeNull();
	});

	test('an element that has no element child', () => {
		const div = createTestDocument('<div>text<!-- comment --></div>').querySelector('div');
		expect(div?.firstElementChild).toBeNull();
		expect(div?.lastElementChild).toBeNull();
	});

	test('an element whose element children are interleaved with text', () => {
		const div = createTestDocument('<div>x<p>a</p>y<span>b</span>z</div>').querySelector('div');
		expect(div?.firstElementChild?.localName).toBe('p');
		expect(div?.lastElementChild?.localName).toBe('span');
	});
});

describe('MLParentNode#firstElementChild and #lastElementChild on the other parent nodes', () => {
	test('a document: the document element, with a doctype before it and a comment after it', () => {
		const doc = createTestDocument('<!doctype html><html><head></head><body><p>a</p></body></html><!-- c -->');
		expect(doc.firstElementChild?.localName).toBe('html');
		expect(doc.lastElementChild?.localName).toBe('html');
	});

	test('a document of a fragment that has two or more elements at the top', () => {
		const doc = createTestDocument('<p>a</p>x<em>b</em><span>c</span>');
		expect(doc.firstElementChild?.localName).toBe('p');
		expect(doc.lastElementChild?.localName).toBe('span');
	});

	test('the content of a template element: a tree of its own', () => {
		const doc = createTestDocument('<template>x<p>a</p>y<span>b</span>z</template>');
		const content = doc.querySelector('template')?.content;
		expect(content?.firstElementChild?.localName).toBe('p');
		expect(content?.lastElementChild?.localName).toBe('span');
	});

	test('an element whose only child is a template element: the template, not an element in its content', () => {
		const div = createTestDocument('<div><template><p>a</p><span>b</span></template></div>').querySelector('div');
		expect(div?.firstElementChild?.localName).toBe('template');
		expect(div?.lastElementChild?.localName).toBe('template');
	});
});

/**
 * The children of an `each` block are the children of the element that has the block, as `MLNode#childNodes`
 * flattens it.
 */
describe('MLParentNode#firstElementChild and #lastElementChild with an each block', () => {
	async function svelteParser(): Promise<MLParser> {
		return (await import('@markuplint/svelte-parser')).parser;
	}

	test('an element whose last element child is in an each block', async () => {
		const ul = createTestDocument(
			'<ul><li class="outside">a</li>{#each items as item}<li class="in-each">{item}</li>{/each}</ul>',
			{ parser: await svelteParser() },
		).querySelector('ul');
		expect(ul?.firstElementChild?.className).toBe('outside');
		expect(ul?.lastElementChild?.className).toBe('in-each');
	});

	test('an element whose first element child is in an each block', async () => {
		const ul = createTestDocument(
			'<ul>{#each items as item}<li class="in-each">{item}</li>{/each}<li class="outside">a</li></ul>',
			{ parser: await svelteParser() },
		).querySelector('ul');
		expect(ul?.firstElementChild?.className).toBe('in-each');
		expect(ul?.lastElementChild?.className).toBe('outside');
	});
});
