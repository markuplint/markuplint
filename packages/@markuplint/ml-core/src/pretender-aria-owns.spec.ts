// @ts-nocheck

import specs from '@markuplint/html-spec';
import { getAriaOwnedElements, getAriaOwner } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

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
	});
});
