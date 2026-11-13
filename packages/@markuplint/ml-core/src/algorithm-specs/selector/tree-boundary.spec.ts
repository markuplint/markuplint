// @ts-nocheck

import { Selector } from '@markuplint/selector';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

/**
 * Wraps an element of a plain DOM so that it tells what a host with trees of its own tells: the
 * parent in its tree, and whether its children are in a tree of their own.
 *
 * @param el - An element
 * @param members - The optional members of `SelectorElement` to add
 * @returns The element that has them
 */
function withMembers(el: Element, members: Record<string, unknown>) {
	return new Proxy(el, {
		get(target, name) {
			if (typeof name === 'string' && name in members) {
				return members[name];
			}
			const value = Reflect.get(target, name);
			return typeof value === 'function' ? value.bind(target) : value;
		},
	});
}

function pOf(html: string) {
	return elementOf(html, 'p');
}

describe('treeParentElement', () => {
	const html = '<section><div><p></p></div></section>';

	test('is not read from a plain DOM, whose parentElement is what the tree says', () => {
		expect(new Selector('section p').match(pOf(html)) !== false).toBe(true);
		expect(new Selector('div > p').match(pOf(html)) !== false).toBe(true);
	});

	test('a descendant combinator stops where the element has no parent in its tree', () => {
		const p = withMembers(pOf(html), { treeParentElement: null });
		expect(new Selector('section p').match(p)).toBe(false);
		expect(new Selector('div p').match(p)).toBe(false);
	});

	test('a child combinator reads it instead of parentElement', () => {
		const p = withMembers(pOf(html), { treeParentElement: null });
		expect(new Selector('div > p').match(p)).toBe(false);
	});

	test(':closest stops where the element has no parent in its tree', () => {
		const p = withMembers(pOf(html), { treeParentElement: null });
		expect(new Selector('p:closest(div)').match(p)).toBe(false);
		expect(new Selector('p:closest(div)').match(pOf(html)) !== false).toBe(true);
	});

	test('the parent that it names is the one the combinator matches', () => {
		const original = pOf(html);
		const section = original.parentElement.parentElement;
		const p = withMembers(original, { treeParentElement: section });
		expect(new Selector('section > p').match(p) !== false).toBe(true);
		expect(new Selector('div > p').match(p)).toBe(false);
	});
});

describe('isHTMLTemplateElement', () => {
	test(':has does not look into the children of an element that has a tree of their own', () => {
		const section = elementOf('<section><p></p></section>', 'section');
		expect(new Selector('section:has(p)').match(section) !== false).toBe(true);
		expect(new Selector('section:has(p)').match(withMembers(section, { isHTMLTemplateElement: true }))).toBe(false);
	});
});
