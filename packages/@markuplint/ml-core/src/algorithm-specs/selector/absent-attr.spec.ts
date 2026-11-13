import type { SelectorElement } from '@markuplint/selector';

import { matchSelector, Selector } from '@markuplint/selector';
import { describe, expect, test } from 'vitest';

/**
 * An attribute that the framework does not output (`disabled={false}`) is in the list of the
 * attributes of the element but is not an attribute of the DOM, so no selector matches it.
 */
type Attribute = { readonly name: string; readonly value?: string; readonly absent?: boolean };

function element(attributes: readonly Attribute[]): SelectorElement {
	const el = {
		nodeType: 1,
		nodeName: 'X',
		localName: 'x',
		id: '',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
		classList: { contains: () => false },
		parent: null,
		parentElement: null,
		prevElementSibling: null,
		nextElementSibling: null,
		childElements: [],
		attributes: attributes.map(attr => ({ localName: attr.name, value: '', namespaceURI: null, ...attr })),
	};
	return el as unknown as SelectorElement;
}

describe('a selector of an attribute', () => {
	test('matches an attribute that is output', () => {
		const el = element([{ name: 'disabled', absent: false }]);
		expect(new Selector('[disabled]').match(el)).not.toBe(false);
	});

	test('matches an attribute that does not say', () => {
		const el = element([{ name: 'disabled' }]);
		expect(new Selector('[disabled]').match(el)).not.toBe(false);
	});

	test('does not match an attribute that is absent', () => {
		const el = element([{ name: 'disabled', absent: true }]);
		expect(new Selector('[disabled]').match(el)).toBe(false);
	});

	test('does not match the value of an attribute that is absent', () => {
		const el = element([{ name: 'title', value: '', absent: true }]);
		expect(new Selector('[title=""]').match(el)).toBe(false);
		expect(new Selector('[title^=""]').match(el)).toBe(false);
	});

	test('matches the attribute that is output when the same name is written twice', () => {
		const el = element([
			{ name: 'class', value: 'a', absent: true },
			{ name: 'class', value: 'b', absent: false },
		]);
		expect(new Selector('[class="b"]').match(el)).not.toBe(false);
		expect(new Selector('[class="a"]').match(el)).toBe(false);
	});

	test('a negation of an absent attribute matches', () => {
		const el = element([{ name: 'disabled', absent: true }]);
		expect(new Selector(':not([disabled])').match(el)).not.toBe(false);
	});
});

describe('a selector of the name and the value of an attribute (the one of a configuration)', () => {
	test('matches an attribute that is output', () => {
		const el = element([{ name: 'disabled', absent: false }]);
		expect(matchSelector(el, { attrName: 'disabled' }).matched).toBe(true);
	});

	test('does not match an attribute that is absent', () => {
		const el = element([{ name: 'disabled', absent: true }]);
		expect(matchSelector(el, { attrName: 'disabled' }).matched).toBe(false);
		expect(matchSelector(el, { attrName: '/^dis/' }).matched).toBe(false);
	});

	test('does not match the value of an attribute that is absent', () => {
		const el = element([{ name: 'title', value: 'x', absent: true }]);
		expect(matchSelector(el, { attrValue: 'x' }).matched).toBe(false);
		expect(matchSelector(element([{ name: 'title', value: 'x' }]), { attrValue: 'x' }).matched).toBe(true);
	});

	test('matches by the attribute that is output', () => {
		const el = element([
			{ name: 'title', value: 'a', absent: true },
			{ name: 'title', value: 'b' },
		]);
		expect(matchSelector(el, { attrName: 'title', attrValue: 'b' }).matched).toBe(true);
		expect(matchSelector(el, { attrName: 'title', attrValue: 'a' }).matched).toBe(false);
	});
});
