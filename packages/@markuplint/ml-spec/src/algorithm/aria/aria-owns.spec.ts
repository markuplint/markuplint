import specs from '@markuplint/html-spec';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import {
	getAriaOwnedElements as _getAriaOwnedElements,
	getAriaOwner as _getAriaOwner,
	getAriaOwnsTarget,
	getOwnedChildElements as _getOwnedChildElements,
	getOwningParentElement as _getOwningParentElement,
	isCircularAriaOwnsReference,
} from './aria-owns.js';

const getAriaOwner = (el: Element) => _getAriaOwner(el, specs, '1.3');
const getAriaOwnedElements = (el: Element) => _getAriaOwnedElements(el, specs, '1.3');
const getOwnedChildElements = (el: Element) => _getOwnedChildElements(el, specs, '1.3');
const getOwningParentElement = (el: Element) => _getOwningParentElement(el, specs, '1.3');

function _(html: string, selector: string) {
	return createJSDOMElement(html, selector);
}

// `createJSDOMElement` puts the markup in a document fragment, which is the root of the elements
function byId(el: Element, id: string) {
	return (el.getRootNode() as DocumentFragment).getElementById(id)!;
}

describe('getAriaOwner', () => {
	test('the element whose aria-owns lists the ID', () => {
		const el = _('<div id="owner" aria-owns="x y"></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBe(byId(el, 'owner'));
	});

	test('no aria-owns lists the ID', () => {
		const el = _('<div aria-owns="x"></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('an element without an ID has no owner', () => {
		const el = _('<div aria-owns="y"></div><span></span>', 'span');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('the first element in tree order is the owner', () => {
		const el = _('<div id="a" aria-owns="y"></div><div id="b" aria-owns="y"></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBe(byId(el, 'a'));
	});

	test('only the first element with the ID is referred to', () => {
		const el = _('<div aria-owns="y"></div><div id="y"></div><p id="y"></p>', 'p');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('the aria-owns of a hidden element is not resolved, and the next one is', () => {
		const el = _('<div id="a" aria-owns="y" hidden></div><div id="b" aria-owns="y"></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBe(byId(el, 'b'));
	});

	test('the aria-owns of an element in an aria-hidden subtree is not resolved', () => {
		const el = _('<div aria-hidden="true"><div aria-owns="y"></div></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('the aria-owns of a descendant of a role with presentational children is not resolved', () => {
		const el = _('<button><span aria-owns="y"></span></button><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('the aria-owns of a descendant of an explicit role with presentational children is not resolved', () => {
		const el = _('<div role="img"><span aria-owns="y"></span></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('the aria-owns of an element hidden by an inline style is not resolved', () => {
		const el = _('<div style="display: none"><span aria-owns="y"></span></div><div id="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('an element hidden from all users is not owned', () => {
		const el = _('<div aria-owns="y"></div><div hidden><div id="y"></div></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('an element in an aria-hidden subtree is still owned', () => {
		const el = _('<div id="owner" aria-owns="y"></div><div aria-hidden="true"><span id="y"></span></div>', '#y');
		expect(getAriaOwner(el)).toBe(byId(el, 'owner'));
	});

	test('an element that lists its own ID is not its own owner', () => {
		const el = _('<div id="y" aria-owns="y"></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('a descendant cannot own its ancestor', () => {
		const el = _('<div id="y"><span aria-owns="y"></span></div>', '#y');
		expect(getAriaOwner(el)).toBeNull();
	});

	test('every reference of a cycle is ignored', () => {
		const el = _(
			'<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c" aria-owns="a"></div>',
			'#a',
		);
		expect(getAriaOwner(el)).toBeNull();
		expect(getAriaOwner(byId(el, 'b'))).toBeNull();
		expect(getAriaOwner(byId(el, 'c'))).toBeNull();
	});

	test('a cycle that ignoring other references would reopen is ignored too, so the tree has no cycle', () => {
		// The cycle a <-> b is ignored, so `a` goes back to its DOM parent `d`; `d` is owned by `x`, which is
		// in `b`, which is in `a`: the reference to `d` closes a new cycle and is ignored as well.
		const el = _(
			'<div id="d"><div id="a" aria-owns="b"><div id="b" aria-owns="a"><div id="x" aria-owns="d"></div></div></div></div>',
			'#a',
		);
		expect(getAriaOwner(el)).toBeNull();
		expect(getAriaOwner(byId(el, 'b'))).toBeNull();
		expect(getAriaOwner(byId(el, 'd'))).toBeNull();
		for (const start of ['a', 'b', 'd', 'x']) {
			const visited = new Set<Element>();
			let current: Element | null = byId(el, start);
			while (current) {
				expect(visited.has(current)).toBe(false);
				visited.add(current);
				current = getOwningParentElement(current);
			}
		}
	});

	test('an element owned by its own descendant, which owns an ancestor of the element, has no cycle', () => {
		const el = _('<div id="x"><div id="o" aria-owns="x"><span id="z" aria-owns="o"></span></div></div>', '#x');
		for (const start of ['x', 'o', 'z']) {
			const visited = new Set<Element>();
			let current: Element | null = byId(el, start);
			while (current) {
				expect(visited.has(current)).toBe(false);
				visited.add(current);
				current = getOwningParentElement(current);
			}
		}
	});

	test('the references of a cycle and the ones that close a cycle after it is broken are all ignored', () => {
		// `o` and `p` own each other; once that is broken, `o` is back in `e`, which it owns
		const el = _('<div id="e"><div id="o" aria-owns="e p"></div></div><div id="p" aria-owns="o"></div>', '#e');
		expect(getAriaOwner(el)).toBeNull();
		expect(getAriaOwner(byId(el, 'o'))).toBeNull();
		expect(getAriaOwner(byId(el, 'p'))).toBeNull();
	});

	test('a reference that is not part of a cycle stays when another one is', () => {
		// `a` and `b` own each other, and `c` owns `d` apart from them
		const el = _(
			'<div id="a" aria-owns="b"></div><div id="b" aria-owns="a"></div><div id="c" aria-owns="d"></div><div id="d"></div>',
			'#d',
		);
		expect(getAriaOwner(el)).toBe(byId(el, 'c'));
		expect(getAriaOwner(byId(el, 'a'))).toBeNull();
	});

	test('a chain that is not a cycle is resolved', () => {
		const el = _('<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c"></div>', '#c');
		expect(getAriaOwner(el)).toBe(byId(el, 'b'));
		expect(getAriaOwner(byId(el, 'b'))).toBe(byId(el, 'a'));
	});
});

describe('getAriaOwnedElements', () => {
	test('in the order aria-owns lists them, without the IDs that do not exist', () => {
		const el = _('<div id="owner" aria-owns="c missing a"></div><div id="a"></div><div id="c"></div>', '#owner');
		expect(getAriaOwnedElements(el)).toStrictEqual([byId(el, 'c'), byId(el, 'a')]);
	});

	test('an element that an earlier aria-owns took is not owned', () => {
		const el = _('<div aria-owns="y"></div><div id="owner" aria-owns="y"></div><div id="y"></div>', '#owner');
		expect(getAriaOwnedElements(el)).toStrictEqual([]);
	});

	test('an ID listed twice is owned once', () => {
		const el = _('<div id="owner" aria-owns="y y"></div><div id="y"></div>', '#owner');
		expect(getAriaOwnedElements(el)).toStrictEqual([byId(el, 'y')]);
	});

	test('no aria-owns', () => {
		const el = _('<div id="owner"></div>', '#owner');
		expect(getAriaOwnedElements(el)).toStrictEqual([]);
	});
});

describe('getOwnedChildElements', () => {
	test('the child elements first, then the owned elements', () => {
		const el = _('<div id="owner" aria-owns="z"><span id="a"></span></div><p id="z"></p>', '#owner');
		expect(getOwnedChildElements(el)).toStrictEqual([byId(el, 'a'), byId(el, 'z')]);
	});

	test('a child that another element owns is not a child', () => {
		const el = _(
			'<div id="parent"><span id="a"></span><span id="b"></span></div><div aria-owns="a"></div>',
			'#parent',
		);
		expect(getOwnedChildElements(el)).toStrictEqual([byId(el, 'b')]);
	});

	test('a child that its own aria-owns lists is listed once, where the DOM puts it', () => {
		const el = _('<div id="owner" aria-owns="a"><span id="a"></span><span id="b"></span></div>', '#owner');
		expect(getOwnedChildElements(el)).toStrictEqual([byId(el, 'a'), byId(el, 'b')]);
	});
});

describe('getAriaOwnsTarget', () => {
	test('the first element with the ID in the tree', () => {
		const el = _('<div id="owner" aria-owns="y"></div><span id="y"></span><p id="y"></p>', '#owner');
		expect(getAriaOwnsTarget(el, 'y')).toBe(el.parentNode!.querySelector('span'));
	});

	test('no element with the ID', () => {
		const el = _('<div id="owner" aria-owns="y"></div>', '#owner');
		expect(getAriaOwnsTarget(el, 'y')).toBeNull();
	});
});

describe('isCircularAriaOwnsReference', () => {
	test('an element that refers to itself', () => {
		const el = _('<div id="y" aria-owns="y"></div>', '#y');
		expect(isCircularAriaOwnsReference(el, el)).toBe(true);
	});

	test('an element that refers to its ancestor', () => {
		const el = _('<div id="y"><span aria-owns="y"></span></div>', 'span');
		expect(isCircularAriaOwnsReference(el, byId(el, 'y'))).toBe(true);
	});

	test('two elements that refer to each other', () => {
		const el = _('<div id="a" aria-owns="b"></div><div id="b" aria-owns="a"></div>', '#a');
		expect(isCircularAriaOwnsReference(el, byId(el, 'b'))).toBe(true);
		expect(isCircularAriaOwnsReference(byId(el, 'b'), el)).toBe(true);
	});

	test('a cycle through a hidden element is still a cycle', () => {
		const el = _('<div id="a" aria-owns="b" hidden></div><div id="b" aria-owns="a"></div>', '#b');
		expect(isCircularAriaOwnsReference(el, byId(el, 'a'))).toBe(true);
	});

	test('a reference that closes a cycle once another cycle is broken is circular too', () => {
		// `z` owns `o`, its DOM parent (a cycle); without it, `o` owning its DOM parent `x` is a cycle
		const el = _('<div id="x"><div id="o" aria-owns="x"><span id="z" aria-owns="o"></span></div></div>', '#o');
		expect(isCircularAriaOwnsReference(byId(el, 'z'), el)).toBe(true);
		expect(isCircularAriaOwnsReference(el, byId(el, 'x'))).toBe(true);
	});

	test('an element moved away from its DOM parent may own that parent', () => {
		// `r` is owned by `q`, so owning `a`, its DOM parent, makes the tree q > r > a
		const el = _('<div id="a"><span id="r" aria-owns="a"></span></div><div id="q" aria-owns="r"></div>', '#r');
		expect(isCircularAriaOwnsReference(el, byId(el, 'a'))).toBe(false);
	});

	test('an element that refers to its own child is not circular', () => {
		const el = _('<div id="owner" aria-owns="c"><span id="c"></span></div>', '#owner');
		expect(isCircularAriaOwnsReference(el, byId(el, 'c'))).toBe(false);
	});

	test('a chain that is not a cycle', () => {
		const el = _('<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c"></div>', '#a');
		expect(isCircularAriaOwnsReference(el, byId(el, 'b'))).toBe(false);
		expect(isCircularAriaOwnsReference(byId(el, 'b'), byId(el, 'c'))).toBe(false);
	});
});

describe('getOwningParentElement', () => {
	test('the owner of an owned element', () => {
		const el = _('<section><div id="owner" aria-owns="y"></div></section><p><span id="y"></span></p>', '#y');
		expect(getOwningParentElement(el)).toBe(byId(el, 'owner'));
	});

	test('the parent element of an element that is not owned', () => {
		const el = _('<p><span id="y"></span></p>', '#y');
		expect(getOwningParentElement(el)).toBe(el.parentElement);
	});
});
