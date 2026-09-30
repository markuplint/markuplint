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
