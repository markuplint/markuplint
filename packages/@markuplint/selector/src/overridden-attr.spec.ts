import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, test } from 'vitest';

import { Selector } from './selector.js';

beforeEach(() => {
	const dom = new JSDOM();
	globalThis.Element = dom.window.Element as unknown as typeof Element;
});

/**
 * Of two attributes of one name, the element has one (the first in the HTML syntax, the last in a props object): the
 * other is in the list of the attributes of the element but is not an attribute of the DOM, so no selector matches it.
 */
type Attribute = { readonly name: string; readonly value: string; readonly overridden?: boolean };

function element(attributes: readonly Attribute[]): Element {
	const el = {
		nodeType: 1,
		nodeName: 'X',
		localName: 'x',
		id: '',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
		classList: { contains: () => false },
		parentNode: null,
		parentElement: null,
		previousElementSibling: null,
		nextElementSibling: null,
		children: [],
		attributes: attributes.map(attr => ({ localName: attr.name, namespaceURI: null, ...attr })),
	};
	return el as unknown as Element;
}

describe('a selector of an attribute', () => {
	const el = element([
		{ name: 'role', value: 'a' },
		{ name: 'role', value: 'b', overridden: true },
	]);

	test('matches the attribute that the element has', () => {
		expect(new Selector('[role=a]').match(el)).not.toBe(false);
	});

	test('does not match an attribute that another of its name overrides', () => {
		expect(new Selector('[role=b]').match(el)).toBe(false);
		expect(new Selector('[role$=b]').match(el)).toBe(false);
	});
});
