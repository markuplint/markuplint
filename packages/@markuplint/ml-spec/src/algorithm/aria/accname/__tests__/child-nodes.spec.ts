/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import { describe, test, expect } from 'vitest';

import { computeAccessibleName } from '../compute.js';
import { findChildrenByLocalName } from '../helpers.js';

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

	test('the title of an SVG element is looked up through the resolver', () => {
		const svg = element('svg', { namespaceURI: 'http://www.w3.org/2000/svg' });
		const title = element('title', {
			children: [textNode('Logo')],
			namespaceURI: 'http://www.w3.org/2000/svg',
		});
		const resolver = {
			...createTestResolver(),
			getChildNodes: (el: typeof svg) => (el === svg ? [title] : el.childNodes),
		};

		expect(computeAccessibleName(svg, resolver)).toStrictEqual({ name: 'Logo', source: 'svg-title' });
	});

	test('the options of a select are collected through the resolver', () => {
		const select = element('select');
		const red = element('option', { children: [textNode('Red')] });
		const blue = element('option', { attrs: { selected: '' }, children: [textNode('Blue')] });
		const heading = element('h1', { children: [textNode('Color: '), select] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['h1']) }),
			getChildNodes: (el: typeof select) => (el === select ? [red, blue] : el.childNodes),
		};

		expect(computeAccessibleName(heading, resolver).name).toBe('Color: Blue');
	});

	test('the options of an optgroup are collected through the resolver', () => {
		const select = element('select');
		const optgroup = element('optgroup');
		const red = element('option', { children: [textNode('Red')] });
		const heading = element('h1', { children: [textNode('Color: '), select] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['h1']) }),
			getChildNodes: (el: typeof select) => {
				if (el === select) {
					return [optgroup];
				}
				return el === optgroup ? [red] : el.childNodes;
			},
		};

		expect(computeAccessibleName(heading, resolver).name).toBe('Color: Red');
	});

	test('the text of the selected option is read through the resolver', () => {
		const select = element('select');
		const option = element('option', { children: [textNode('Written')] });
		const heading = element('h1', { children: [textNode('Color: '), select] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['h1']) }),
			getChildNodes: (el: typeof select) => {
				if (el === select) {
					return [option];
				}
				return el === option ? [textNode('Rendered')] : el.childNodes;
			},
		};

		expect(computeAccessibleName(heading, resolver).name).toBe('Color: Rendered');
	});

	test('the text of an SVG title is read through the resolver', () => {
		const svg = element('svg', { namespaceURI: 'http://www.w3.org/2000/svg' });
		const title = element('title', {
			children: [textNode('Written')],
			namespaceURI: 'http://www.w3.org/2000/svg',
		});
		const resolver = {
			...createTestResolver(),
			getChildNodes: (el: typeof svg) => {
				if (el === svg) {
					return [title];
				}
				return el === title ? [] : el.childNodes;
			},
		};

		expect(computeAccessibleName(svg, resolver)).toStrictEqual({ name: '', source: null });
	});

	test('the value of an embedded text control is read through the resolver', () => {
		const textarea = element('textarea', { children: [textNode('Written')] });
		const heading = element('h1', { children: [textNode('Note: '), textarea] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['h1']) }),
			getChildNodes: (el: typeof textarea) => (el === textarea ? [textNode('Rendered')] : el.childNodes),
		};

		expect(computeAccessibleName(heading, resolver).name).toBe('Note: Rendered');
	});
});

describe('AccnameResolver.mayBeAbsentWith', () => {
	test('the legend that gives a name is taken among the candidates', () => {
		const fieldset = element('fieldset');
		const empty = element('legend');
		const named = element('legend', { children: [textNode('Address')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['legend']) }),
			mayBeAbsentWith: () => true,
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [empty, named] : el.childNodes),
		};

		expect(computeAccessibleName(fieldset, resolver)).toStrictEqual({ name: 'Address', source: 'legend' });
	});

	test('the first legend is the only candidate without it', () => {
		const fieldset = element('fieldset');
		const empty = element('legend');
		const named = element('legend', { children: [textNode('Address')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['legend']) }),
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [empty, named] : el.childNodes),
		};

		expect(computeAccessibleName(fieldset, resolver)).toStrictEqual({ name: '', source: null });
	});

	test('a candidate that an earlier one may not be absent with is not taken', () => {
		const fieldset = element('fieldset');
		const empty = element('legend');
		const named = element('legend', { children: [textNode('Address')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['legend']) }),
			mayBeAbsentWith: () => false,
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [empty, named] : el.childNodes),
		};

		expect(computeAccessibleName(fieldset, resolver)).toStrictEqual({ name: '', source: null });
	});

	test('the caption that gives a name is taken among the candidates', () => {
		const table = element('table');
		const empty = element('caption');
		const named = element('caption', { children: [textNode('Prices')] });
		const resolver = {
			...createTestResolver({ nameFromContent: new Set(['caption']) }),
			mayBeAbsentWith: () => true,
			getChildNodes: (el: typeof table) => (el === table ? [empty, named] : el.childNodes),
		};

		expect(computeAccessibleName(table, resolver)).toStrictEqual({ name: 'Prices', source: 'caption' });
	});

	test('the SVG title that gives a name is taken among the candidates', () => {
		const svg = element('svg', { namespaceURI: 'http://www.w3.org/2000/svg' });
		const empty = element('title', { namespaceURI: 'http://www.w3.org/2000/svg' });
		const named = element('title', {
			children: [textNode('Chart')],
			namespaceURI: 'http://www.w3.org/2000/svg',
		});
		const resolver = {
			...createTestResolver(),
			mayBeAbsentWith: () => true,
			getChildNodes: (el: typeof svg) => (el === svg ? [empty, named] : el.childNodes),
		};

		expect(computeAccessibleName(svg, resolver)).toStrictEqual({ name: 'Chart', source: 'svg-title' });
	});
});

describe('findChildrenByLocalName', () => {
	test('reads the children of the element when there is no resolver', () => {
		const fieldset = element('fieldset');
		const legend = element('legend');
		const withChildren = element('fieldset', { children: [element('span'), legend, element('legend')] });
		expect(findChildrenByLocalName(fieldset, 'legend')).toStrictEqual([]);
		expect(findChildrenByLocalName(withChildren, 'legend')).toStrictEqual([legend]);
	});

	test('takes the first child with the name when the resolver does not say which may be absent', () => {
		const fieldset = element('fieldset');
		const [a, b] = [element('legend'), element('legend')];
		const resolver = {
			...createTestResolver(),
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [a, b] : el.childNodes),
		};

		expect(findChildrenByLocalName(fieldset, 'legend', resolver)).toStrictEqual([a]);
	});

	test('asks whether an earlier candidate may be absent with the later one, in that order', () => {
		const fieldset = element('fieldset');
		const [a, b] = [element('legend'), element('legend')];
		const asked: [unknown, unknown][] = [];
		const resolver = {
			...createTestResolver(),
			mayBeAbsentWith: (candidate: unknown, other: unknown) => {
				asked.push([candidate, other]);
				return true;
			},
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [a, b] : el.childNodes),
		};

		expect(findChildrenByLocalName(fieldset, 'legend', resolver)).toStrictEqual([a, b]);
		expect(asked).toStrictEqual([[a, b]]);
	});

	test('takes a later candidate only when every earlier one may be absent with it', () => {
		const fieldset = element('fieldset');
		const [a, b, c] = [element('legend'), element('legend'), element('legend')];
		// a and b may be absent with c, but a is always rendered with b
		const resolver = {
			...createTestResolver(),
			mayBeAbsentWith: (candidate: unknown, other: unknown) => !(candidate === a && other === b),
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [a, b, c] : el.childNodes),
		};

		expect(findChildrenByLocalName(fieldset, 'legend', resolver)).toStrictEqual([a, c]);
	});

	test('skips the children that have another name and the text', () => {
		const fieldset = element('fieldset');
		const [span, legend] = [element('span'), element('legend')];
		const resolver = {
			...createTestResolver(),
			mayBeAbsentWith: () => true,
			getChildNodes: (el: typeof fieldset) => (el === fieldset ? [textNode('x'), span, legend] : el.childNodes),
		};

		expect(findChildrenByLocalName(fieldset, 'legend', resolver)).toStrictEqual([legend]);
	});
});
