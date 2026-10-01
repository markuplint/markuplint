/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import { describe, test, expect } from 'vitest';

import { computeAccessibleName } from '../compute.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

describe('AccnameResolver.getChildNodes', () => {
	test('name from content traverses the nodes the resolver returns instead of childNodes', () => {
		const button = element('button');
		const img = element('img', { attrs: { alt: 'Save' } });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['button']) }),
			getChildNodes: (el: typeof button) => (el === button ? [img] : el.childNodes),
		};

		expect(computeAccessibleName(button, resolver)).toStrictEqual({ name: 'Save', source: 'content' });
	});

	test('without the hook, childNodes are traversed', () => {
		const button = element('button', { children: [textNode('Save')] });
		const resolver = createTestResolver({ nameFromContent: new Set(['button']) });

		expect(computeAccessibleName(button, resolver)).toStrictEqual({ name: 'Save', source: 'content' });
	});

	test('the nodes the resolver returns replace the ones in childNodes', () => {
		const button = element('button', { children: [textNode('Written')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['button']) }),
			getChildNodes: (el: typeof button) => (el === button ? [textNode('Rendered')] : el.childNodes),
		};

		expect(computeAccessibleName(button, resolver)).toStrictEqual({ name: 'Rendered', source: 'content' });
	});

	test('the hook applies to descendants as well as to the element', () => {
		const button = element('button');
		const span = element('span');
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['button']) }),
			getChildNodes: (el: typeof button) => {
				if (el === button) {
					return [span];
				}
				return el === span ? [textNode('Nested')] : el.childNodes;
			},
		};

		expect(computeAccessibleName(button, resolver)).toStrictEqual({ name: 'Nested', source: 'content' });
	});

	test('the caption of a table is looked up through the resolver', () => {
		const table = element('table');
		const caption = element('caption', { children: [textNode('Prices')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['caption']) }),
			getChildNodes: (el: typeof table) => (el === table ? [caption] : el.childNodes),
		};

		expect(computeAccessibleName(table, resolver)).toStrictEqual({ name: 'Prices', source: 'caption' });
	});

	test('the text of a label is read through the resolver', () => {
		const input = element('input', { attrs: { id: 'field1', type: 'text' } });
		const label = element('label');
		const resolver = {
			...createTestResolver({ labels: new Map([['field1', [label]]]) }),
			getChildNodes: (el: typeof label) => (el === label ? [textNode('Rendered label')] : el.childNodes),
		};

		expect(computeAccessibleName(input, resolver)).toStrictEqual({ name: 'Rendered label', source: 'label' });
	});

	test('the legend of a fieldset is looked up through the resolver', () => {
		const fieldset = element('fieldset');
		const legend = element('legend', { children: [textNode('Address')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['legend']) }),
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [legend] : el.childNodes),
		};

		expect(computeAccessibleName(fieldset, resolver)).toStrictEqual({ name: 'Address', source: 'legend' });
	});
});
