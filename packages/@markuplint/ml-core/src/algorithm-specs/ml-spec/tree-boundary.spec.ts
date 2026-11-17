import {
	getAccessibilityParentElement,
	getComposedParentElement,
	getTreeParentElement,
	isNotRendered,
	isRenderedAway,
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

describe('isRenderedAway', () => {
	test('is true only for an element that says the framework renders it away', () => {
		expect(isRenderedAway({ isRenderedAway: true })).toBe(true);
		expect(isRenderedAway({ isRenderedAway: false })).toBe(false);
		expect(isRenderedAway({ isRenderedAway: 'true' })).toBe(false);
		expect(isRenderedAway({ isRenderedAway: 1 })).toBe(false);
		expect(isRenderedAway({})).toBe(false);
	});
});

describe('getAccessibilityParentElement', () => {
	const HTML = 'http://www.w3.org/1999/xhtml';
	type Node = {
		readonly parentElement: Node | null;
		readonly localName: string;
		readonly namespaceURI: string;
		readonly isRenderedAway?: boolean;
		getRootNode(): unknown;
		getFlatTreeSlot(): Node | null | undefined;
	};
	// Every node is in one tree and none is in a shadow tree, so that only what is under test decides the parent
	const root = {};
	const node = (localName: string, parentElement: Node | null, isRenderedAway?: boolean): Node => ({
		parentElement,
		localName,
		namespaceURI: HTML,
		getRootNode: () => root,
		getFlatTreeSlot: () => {},
		...(isRenderedAway === undefined ? {} : { isRenderedAway }),
	});

	test('passes through an element that the framework renders away', () => {
		const menu = node('div', null);
		const away = node('template', menu, true);
		const item = node('button', away);
		expect(getAccessibilityParentElement(item)).toBe(menu);
	});

	test('passes through a chain of them, and a slot among them', () => {
		const menu = node('div', null);
		const outer = node('template', menu, true);
		const slot = node('slot', outer);
		const inner = node('template', slot, true);
		const item = node('button', inner);
		expect(getAccessibilityParentElement(item)).toBe(menu);
	});

	test('does not pass through an element that stays', () => {
		const menu = node('div', null);
		const template = node('template', menu, false);
		const plain = node('template', menu);
		expect(getAccessibilityParentElement(node('button', template))).toBe(template);
		expect(getAccessibilityParentElement(node('button', plain))).toBe(plain);
	});

	test('ends at the top when only elements rendered away are above', () => {
		const away = node('template', null, true);
		expect(getAccessibilityParentElement(node('button', away))).toBeNull();
	});
});
