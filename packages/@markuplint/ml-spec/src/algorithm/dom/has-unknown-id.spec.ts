import { createJSDOMElement, markAttrAsDynamic } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { hasElementOfUnknownId, isUnknownValueAttr, labelledbyMayReferToUnknownId } from './has-unknown-id.js';

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

describe('hasElementOfUnknownId and the tree of ml-core', () => {
	test('[has-unknown-id-007] is what the tree of ml-core tells, which sees more than an id that code gives', () => {
		const div = createJSDOMElement('<div><h2></h2></div>');
		Object.defineProperty(div, 'treeMayHoldUnknownId', { value: () => true, configurable: true });
		expect(hasElementOfUnknownId(div)).toBe(true);
		Object.defineProperty(div, 'treeMayHoldUnknownId', { value: () => false, configurable: true });
		expect(hasElementOfUnknownId(div)).toBe(false);
	});

	test('[has-unknown-id-008] takes the answer of ml-core as it is: the tree of ml-core has read the id already', () => {
		const div = createJSDOMElement('<div><h2 id="h"></h2></div>');
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		Object.defineProperty(div, 'treeMayHoldUnknownId', { value: () => false });
		expect(hasElementOfUnknownId(div)).toBe(false);
	});

	test('[has-unknown-id-009] is false for an element that is in no tree, whatever ml-core tells', () => {
		const detached = createJSDOMElement('<div id="a"></div>').cloneNode(false) as Element;
		Object.defineProperty(detached, 'treeMayHoldUnknownId', { value: () => true });
		expect(hasElementOfUnknownId(detached)).toBe(false);
	});
});

describe('labelledbyMayReferToUnknownId', () => {
	const tree = '<div><h2 id="h"></h2><img aria-labelledby="t"></div>';

	test('[has-unknown-id-010] is false for an element with no aria-labelledby', () => {
		const div = createJSDOMElement('<div><h2 id="h"></h2><img></div>');
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		expect(labelledbyMayReferToUnknownId(must(div.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-011] is true for a value that is not known until it is rendered', () => {
		const div = createJSDOMElement(tree);
		const img = must(div.querySelector('img'));
		markAttrAsDynamic(img, 'aria-labelledby');
		expect(labelledbyMayReferToUnknownId(img)).toBe(true);
	});

	test('[has-unknown-id-012] is true for a token that refers to no element while the tree has an element of unknown id', () => {
		const div = createJSDOMElement(tree);
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		expect(labelledbyMayReferToUnknownId(must(div.querySelector('img')))).toBe(true);
	});

	test('[has-unknown-id-013] is false for a token that refers to no element in a tree whose ids are all known', () => {
		const div = createJSDOMElement(tree);
		expect(labelledbyMayReferToUnknownId(must(div.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-014] is false when every token refers to an element, even in a tree that has an element of unknown id', () => {
		const div = createJSDOMElement('<div><h2 id="h"></h2><p id="p"></p><img aria-labelledby="p"></div>');
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		expect(labelledbyMayReferToUnknownId(must(div.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-015] is false for a value of nothing but white space, which has no token', () => {
		const div = createJSDOMElement('<div><h2 id="h"></h2><img aria-labelledby=" "></div>');
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		expect(labelledbyMayReferToUnknownId(must(div.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-016] is true when one of the tokens refers to no element, and false when each refers to one', () => {
		const html = (value: string) =>
			`<div><h2 id="a"></h2><h3 id="b"></h3><p id="x"></p><img aria-labelledby="${value}"></div>`;
		const mixed = createJSDOMElement(html('a missing'));
		markAttrAsDynamic(must(mixed.querySelector('p')), 'id');
		expect(labelledbyMayReferToUnknownId(must(mixed.querySelector('img')))).toBe(true);

		const resolved = createJSDOMElement(html('a b'));
		markAttrAsDynamic(must(resolved.querySelector('p')), 'id');
		expect(labelledbyMayReferToUnknownId(must(resolved.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-017] resolves a token in the tree of the element: the content of a template element is a tree of its own', () => {
		const html = '<div><h2 id="h"></h2><template><img aria-labelledby="h"><p id="x"></p></template></div>';

		// `h` is in the outer tree, so in the tree of the `img` the token refers to no element: the element
		// of unknown id in the same tree may be the one, and one in the outer tree may not
		const inContent = must(createJSDOMElement(html).querySelector('template')).content;
		markAttrAsDynamic(must(inContent.querySelector('p')), 'id');
		expect(labelledbyMayReferToUnknownId(must(inContent.querySelector('img')))).toBe(true);

		const outer = createJSDOMElement(html);
		markAttrAsDynamic(must(outer.querySelector('h2')), 'id');
		const content = must(outer.querySelector('template')).content;
		expect(labelledbyMayReferToUnknownId(must(content.querySelector('img')))).toBe(false);
	});

	test('[has-unknown-id-018] is false for an element that is in no tree', () => {
		const div = createJSDOMElement(tree);
		markAttrAsDynamic(must(div.querySelector('h2')), 'id');
		const detached = must(div.querySelector('img')).cloneNode(false) as Element;
		expect(labelledbyMayReferToUnknownId(detached)).toBe(false);
	});
});
