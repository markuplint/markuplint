// @ts-nocheck

import specs from '@markuplint/html-spec';
import { getAriaOwnedElements, getAriaOwner } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { isPretenderDeclaredElement } from './ml-dom/index.js';
import { createTestElement } from './test/index.js';

const jsxOptions = async () => ({
	parser: await import('@markuplint/jsx-parser'),
	specs: { ...specs, acceptedAttrNames: 'idl' },
});

describe('aria-owns and the elements that a pretender declares', () => {
	test('an aria-owns of the markup owns an element that a component renders', async () => {
		const root = createTestElement('<div><div role="list" aria-owns="i"></div><Item /></div>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Item',
					as: {
						element: 'div',
						contents: [
							{
								element: 'div',
								attrs: [
									{ name: 'id', value: 'i' },
									{ name: 'role', value: 'listitem' },
								],
							},
						],
					},
				},
			],
		});
		const list = root.querySelector('[role="list"]');
		const owned = getAriaOwnedElements(list, specs, '1.3');
		expect(owned.map(el => [el.localName, el.getAttribute('id')])).toStrictEqual([['div', 'i']]);
		expect(getAriaOwner(owned[0], specs, '1.3')).toBe(list);
	});

	test('an aria-owns that a component renders owns an element of the markup', async () => {
		const root = createTestElement('<div><List /><div id="i" role="listitem">a</div></div>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'List',
					as: {
						element: 'div',
						contents: [
							{
								element: 'div',
								attrs: [
									{ name: 'role', value: 'list' },
									{ name: 'aria-owns', value: 'i' },
								],
							},
						],
					},
				},
			],
		});
		const item = root.querySelector('#i');
		const owner = getAriaOwner(item, specs, '1.3');
		expect(owner?.getAttribute('role')).toBe('list');
		expect(owner?.getAttribute('aria-owns')).toBe('i');
		expect(isPretenderDeclaredElement(owner)).toBe(true);
	});
});

describe('the order of the elements that a pretender declares', () => {
	const item = {
		selector: 'Item',
		as: {
			element: 'div',
			slots: true,
			contents: [
				{
					element: 'div',
					attrs: [
						{ name: 'id', value: 'b' },
						{ name: 'aria-owns', value: 'x' },
					],
				},
				{ slot: true },
				{
					element: 'div',
					attrs: [
						{ name: 'id', value: 'a' },
						{ name: 'aria-owns', value: 'x' },
					],
				},
			],
		},
	};

	test('the first aria-owns in the order the component renders owns the element', async () => {
		const root = createTestElement('<div><Item><div id="c" aria-owns="x"></div></Item><div id="x"></div></div>', {
			...(await jsxOptions()),
			pretenders: [item],
		});
		const owner = getAriaOwner(root.querySelector('#x'), specs, '1.3');
		expect(isPretenderDeclaredElement(owner)).toBe(true);
		expect(owner?.getAttribute('id')).toBe('b');
	});

	test('of two elements with one id, the first in that order is the one an aria-owns refers to', async () => {
		const declared = {
			selector: 'Item',
			as: { element: 'div', contents: [{ element: 'div', attrs: [{ name: 'id', value: 'i' }] }] },
		};
		const writtenFirst = createTestElement('<div><div aria-owns="i"></div><span id="i"></span><Item /></div>', {
			...(await jsxOptions()),
			pretenders: [declared],
		});
		const [ownedFirst] = getAriaOwnedElements(writtenFirst.querySelector('[aria-owns]'), specs, '1.3');
		expect(ownedFirst?.localName).toBe('span');

		const declaredFirst = createTestElement('<div><div aria-owns="i"></div><Item /><span id="i"></span></div>', {
			...(await jsxOptions()),
			pretenders: [declared],
		});
		const [ownedSecond] = getAriaOwnedElements(declaredFirst.querySelector('[aria-owns]'), specs, '1.3');
		expect(isPretenderDeclaredElement(ownedSecond)).toBe(true);
	});
});
