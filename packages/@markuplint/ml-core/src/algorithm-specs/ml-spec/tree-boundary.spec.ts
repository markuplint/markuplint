import {
	getComposedParentElement,
	getTreeParentElement,
	isNotRendered,
	isShadowRoot,
	isSlotElement,
} from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

function must<T>(value: T | null | undefined): T {
	if (value == null) {
		throw new Error('The value is missing');
	}
	return value;
}

describe('getTreeParentElement', () => {
	test('is the parent element in the same tree', () => {
		const section = elementOf('<div><section><p></p></section></div>', 'section');
		const p = must(section.querySelector('p'));
		expect(getTreeParentElement(p)).toBe(section);
		expect(getTreeParentElement(section)?.localName).toBe('div');
	});

	test('is null at the top of a tree', () => {
		const div = elementOf('<div></div>');
		expect(getTreeParentElement(div)).toBeNull();
	});

	test('is null at the top of the content of a template', () => {
		const template = elementOf('<div><template><p></p></template></div>', 'template');
		const p = must(must(template.content).childElements[0]);
		expect(getTreeParentElement(p)).toBeNull();
	});

	test('is null at the top of a shadow root', () => {
		const host = elementOf('<div><template shadowrootmode="open"><p></p></template></div>');
		const p = must(host.deepQuerySelectorAll('p')[0]);
		expect(getTreeParentElement(p)).toBeNull();
	});

	test('is the parent element inside a shadow root', () => {
		const host = elementOf('<div><template shadowrootmode="open"><section><p></p></section></template></div>');
		const section = must(host.deepQuerySelectorAll('section')[0]);
		const p = must(host.deepQuerySelectorAll('p')[0]);
		expect(getTreeParentElement(p)).toBe(section);
	});
});

describe('getComposedParentElement', () => {
	test('is the parent element in the same tree', () => {
		const section = elementOf('<div><section><p></p></section></div>', 'section');
		const p = must(section.querySelector('p'));
		expect(getComposedParentElement(p)).toBe(section);
	});

	test('is null at the top of the content of a template', () => {
		const template = elementOf('<div><template><p></p></template></div>', 'template');
		const p = must(must(template.content).childElements[0]);
		expect(getComposedParentElement(p)).toBeNull();
	});

	test('is the host at the top of a shadow root', () => {
		const host = elementOf('<div><template shadowrootmode="open"><p></p></template></div>');
		const p = must(host.deepQuerySelectorAll('p')[0]);
		expect(getComposedParentElement(p)).toBe(host);
	});

	test('is null for the top of a document', () => {
		const div = elementOf('<div></div>');
		expect(getComposedParentElement(div)).toBeNull();
	});
});

describe('an element whose parent element is only the syntactical parent', () => {
	const documentRoot = { nodeType: 9 };
	const contentRoot = { nodeType: 11 };

	test('has no tree parent where the roots differ', () => {
		const template = { parentElement: null, getRootNode: () => documentRoot };
		const top = {
			parentElement: template,
			getRootNode: () => contentRoot,
			getFlatTreeSlot: (() => {}) as () => undefined,
		};
		expect(getTreeParentElement(top)).toBeNull();
		expect(getComposedParentElement(top)).toBeNull();
	});

	test('has the tree parent where the roots are the same', () => {
		const top = { parentElement: null, getRootNode: () => contentRoot };
		const deep = {
			parentElement: top,
			getRootNode: () => contentRoot,
			getFlatTreeSlot: (() => {}) as () => undefined,
		};
		expect(getTreeParentElement(deep)).toBe(top);
		expect(getComposedParentElement(deep)).toBe(top);
	});

	test('has the host as the composed parent where the root is a shadow root', () => {
		const host = { parentElement: null, getRootNode: () => documentRoot };
		const shadowRoot = { nodeType: 11, host };
		const template = { parentElement: host, getRootNode: () => documentRoot };
		const top = {
			parentElement: template,
			getRootNode: () => shadowRoot,
			getFlatTreeSlot: (() => {}) as () => undefined,
		};
		expect(getTreeParentElement(top)).toBeNull();
		expect(getComposedParentElement(top)).toBe(host);
	});
});

describe('an element of the light DOM of a shadow host', () => {
	const documentRoot = { nodeType: 9 };
	const shadowRoot = { nodeType: 11, host: {} };
	const host = { parentElement: null, getRootNode: () => documentRoot };
	const slot = { parentElement: null, getRootNode: () => shadowRoot };

	test('has the slot that takes it as the composed parent, and the host as the tree parent', () => {
		const child = { parentElement: host, getRootNode: () => documentRoot, getFlatTreeSlot: () => slot };
		expect(getComposedParentElement(child)).toBe(slot);
		expect(getTreeParentElement(child)).toBe(host);
	});

	test('has no composed parent where no slot takes it: it is not rendered', () => {
		const child = { parentElement: host, getRootNode: () => documentRoot, getFlatTreeSlot: () => null };
		expect(getComposedParentElement(child)).toBeNull();
	});

	test('has the parent element where the assignment is not known', () => {
		const assignment = new Map<string, typeof slot>();
		const child = {
			parentElement: host,
			getRootNode: () => documentRoot,
			getFlatTreeSlot: () => assignment.get('the slot of an assignment that is not known'),
		};
		expect(getComposedParentElement(child)).toBe(host);
	});
});

describe('isShadowRoot', () => {
	test.each([
		[
			'a shadow root of a DOM',
			elementOf('<div><template shadowrootmode="open"></template></div>').shadowRoot,
			true,
		],
		['a document fragment that has a host', { nodeType: 11, host: {} }, true],
		['a document fragment that has no host', { nodeType: 11 }, false],
		['an element that has a host', { nodeType: 1, host: {} }, false],
		['null', null, false],
		['a string', 'host', false],
	])('%s', (_, root, expected) => {
		expect(isShadowRoot(root)).toBe(expected);
	});
});

describe('isNotRendered', () => {
	test('is true only for an element that no slot of its shadow host takes', () => {
		expect(isNotRendered({ getFlatTreeSlot: () => null })).toBe(true);
		expect(isNotRendered({ getFlatTreeSlot: () => ({}) })).toBe(false);
		expect(isNotRendered({ getFlatTreeSlot: () => {} })).toBe(false);
	});
});

describe('isSlotElement', () => {
	test('is true for the slot element of the HTML namespace only', () => {
		expect(isSlotElement({ localName: 'slot', namespaceURI: 'http://www.w3.org/1999/xhtml' })).toBe(true);
		expect(isSlotElement({ localName: 'slot', namespaceURI: 'http://www.w3.org/2000/svg' })).toBe(false);
		expect(isSlotElement({ localName: 'div', namespaceURI: 'http://www.w3.org/1999/xhtml' })).toBe(false);
	});
});
