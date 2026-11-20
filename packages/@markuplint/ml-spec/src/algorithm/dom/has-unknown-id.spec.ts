import { createJSDOMElement, markAttrAsDynamic } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { hasElementOfUnknownId, isUnknownValueAttr } from './has-unknown-id.js';

function must<T>(value: T | null | undefined): T {
	if (value == null) {
		throw new Error('The value is missing');
	}
	return value;
}

describe('isUnknownValueAttr', () => {
	test('[has-unknown-id-001] is false for no attribute and for an attribute of a DOM', () => {
		const el = createJSDOMElement('<div id="a"></div>');
		expect(isUnknownValueAttr(null)).toBe(false);
		expect(isUnknownValueAttr(el.getAttributeNode('id'))).toBe(false);
	});

	test('[has-unknown-id-002] is true for a value that is not known', () => {
		const el = createJSDOMElement('<div id="a"></div>');
		markAttrAsDynamic(el, 'id');
		expect(isUnknownValueAttr(el.getAttributeNode('id'))).toBe(true);
	});
});

describe('hasElementOfUnknownId', () => {
	test('[has-unknown-id-003] is false in a tree of a DOM, whose ids are all known', () => {
		const el = createJSDOMElement('<div><h2 id="h"></h2><p></p></div>', 'p');
		expect(hasElementOfUnknownId(el)).toBe(false);
	});

	test('[has-unknown-id-004] is true for every element of the tree that has one, the one itself too', () => {
		const div = createJSDOMElement('<div><h2 id="h"></h2><p></p></div>');
		const h2 = must(div.querySelector('h2'));
		markAttrAsDynamic(h2, 'id');
		expect(hasElementOfUnknownId(must(div.querySelector('p')))).toBe(true);
		expect(hasElementOfUnknownId(h2)).toBe(true);
		expect(hasElementOfUnknownId(div)).toBe(true);
	});

	test('[has-unknown-id-005] does not cross the boundary of the content of a template element', () => {
		const div = createJSDOMElement('<div><template><h2 id="h"></h2><i></i></template><p></p></div>');
		const content = must(div.querySelector('template')).content;
		markAttrAsDynamic(must(content.querySelector('h2')), 'id');

		// The tree of the content has it, and the tree that holds the `template` does not
		expect(hasElementOfUnknownId(must(content.querySelector('i')))).toBe(true);
		expect(hasElementOfUnknownId(must(div.querySelector('p')))).toBe(false);
	});

	test('[has-unknown-id-006] is false for an element that is in no tree', () => {
		// A detached element is the root of itself
		const detached = createJSDOMElement('<div id="a"></div>').cloneNode(false) as Element;
		markAttrAsDynamic(detached, 'id');
		expect(hasElementOfUnknownId(detached)).toBe(false);
	});
});
