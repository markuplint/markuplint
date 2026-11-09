import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getComposedParentElement, getTreeParentElement, isShadowRoot } from './tree-boundary.js';

function must<T>(value: T | null | undefined): T {
	if (value == null) {
		throw new Error('The value is missing');
	}
	return value;
}

describe('getTreeParentElement', () => {
	test('is the parent element in the same tree', () => {
		const section = createJSDOMElement('<div><section><p></p></section></div>', 'section');
		const p = must(section.querySelector('p'));
		expect(getTreeParentElement(p)).toBe(section);
		expect(getTreeParentElement(section)?.localName).toBe('div');
	});

	test('is null at the top of a tree', () => {
		const div = createJSDOMElement('<div></div>');
		expect(getTreeParentElement(div)).toBeNull();
	});

	test('is null at the top of the content of a template', () => {
		const template = createJSDOMElement(
			'<div><template><p></p></template></div>',
			'template',
		) as HTMLTemplateElement;
		const p = must((template.content as DocumentFragment).firstElementChild);
		expect(getTreeParentElement(p)).toBeNull();
	});

	test('is null at the top of a shadow root', () => {
		const host = createJSDOMElement('<div></div>');
		const shadowRoot = host.attachShadow({ mode: 'open' });
		const p = host.ownerDocument.createElement('p');
		shadowRoot.append(p);
		expect(getTreeParentElement(p)).toBeNull();
	});

	test('is the parent element inside a shadow root', () => {
		const host = createJSDOMElement('<div></div>');
		const shadowRoot = host.attachShadow({ mode: 'open' });
		const section = host.ownerDocument.createElement('section');
		const p = host.ownerDocument.createElement('p');
		section.append(p);
		shadowRoot.append(section);
		expect(getTreeParentElement(p)).toBe(section);
	});
});

describe('getComposedParentElement', () => {
	test('is the parent element in the same tree', () => {
		const section = createJSDOMElement('<div><section><p></p></section></div>', 'section');
		const p = must(section.querySelector('p'));
		expect(getComposedParentElement(p)).toBe(section);
	});

	test('is null at the top of the content of a template', () => {
		const template = createJSDOMElement(
			'<div><template><p></p></template></div>',
			'template',
		) as HTMLTemplateElement;
		const p = must((template.content as DocumentFragment).firstElementChild);
		expect(getComposedParentElement(p)).toBeNull();
	});

	test('is the host at the top of a shadow root', () => {
		const host = createJSDOMElement('<div></div>');
		const shadowRoot = host.attachShadow({ mode: 'open' });
		const p = host.ownerDocument.createElement('p');
		shadowRoot.append(p);
		expect(getComposedParentElement(p)).toBe(host);
	});

	test('is null for the top of a document', () => {
		const div = createJSDOMElement('<div></div>');
		expect(getComposedParentElement(div)).toBeNull();
	});
});

describe('an element whose parent element is only the syntactical parent', () => {
	const documentRoot = { nodeType: 9 };
	const contentRoot = { nodeType: 11 };

	test('has no tree parent where the roots differ', () => {
		const template = { parentElement: null, getRootNode: () => documentRoot };
		const top = { parentElement: template, getRootNode: () => contentRoot };
		expect(getTreeParentElement(top)).toBeNull();
		expect(getComposedParentElement(top)).toBeNull();
	});

	test('has the tree parent where the roots are the same', () => {
		const top = { parentElement: null, getRootNode: () => contentRoot };
		const deep = { parentElement: top, getRootNode: () => contentRoot };
		expect(getTreeParentElement(deep)).toBe(top);
		expect(getComposedParentElement(deep)).toBe(top);
	});

	test('has the host as the composed parent where the root is a shadow root', () => {
		const host = { parentElement: null, getRootNode: () => documentRoot };
		const shadowRoot = { nodeType: 11, host };
		const template = { parentElement: host, getRootNode: () => documentRoot };
		const top = { parentElement: template, getRootNode: () => shadowRoot };
		expect(getTreeParentElement(top)).toBeNull();
		expect(getComposedParentElement(top)).toBe(host);
	});
});

describe('isShadowRoot', () => {
	test.each([
		['a shadow root of a DOM', createJSDOMElement('<div></div>').attachShadow({ mode: 'open' }), true],
		['a document fragment that has a host', { nodeType: 11, host: {} }, true],
		['a document fragment that has no host', { nodeType: 11 }, false],
		['an element that has a host', { nodeType: 1, host: {} }, false],
		['null', null, false],
		['a string', 'host', false],
	])('%s', (_, root, expected) => {
		expect(isShadowRoot(root)).toBe(expected);
	});
});

describe('an element without getRootNode', () => {
	test('is in one tree with a parent element that has getRootNode', () => {
		const parent = { parentElement: null, getRootNode: () => ({}) };
		const el = { parentElement: parent };
		expect(getTreeParentElement(el)).toBe(parent);
	});

	test('is in one tree with its parent element when only the element has getRootNode', () => {
		const parent = { parentElement: null };
		const el = { parentElement: parent, getRootNode: () => ({}) };
		expect(getTreeParentElement(el)).toBe(parent);
	});

	test('is in one tree with its parent element', () => {
		const parent = { parentElement: null };
		const el = { parentElement: parent };
		expect(getTreeParentElement(el)).toBe(parent);
		expect(getComposedParentElement(el)).toBe(parent);
		expect(getComposedParentElement(parent)).toBeNull();
	});
});
