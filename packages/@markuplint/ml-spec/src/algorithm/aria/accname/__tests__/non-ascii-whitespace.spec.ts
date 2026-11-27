/**
 * A text or an attribute value of non-ASCII white space only (U+00A0, U+FEFF, U+2028, …) is not the
 * empty string: whitespace is ASCII white space, and a flat string folds carriage returns, newlines,
 * tabs and form-feeds only. The accessible name has a source for it, and the source of the name is
 * missing for the ASCII white space only.
 *
 * @see https://w3c.github.io/accname/#comp_label
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */

import type { AccnameElement, AccnameResolver } from '../types.js';

import { describe, expect, test } from 'vitest';

import { computeAccessibleName } from '../compute.js';
import { flattenText } from '../result.js';
import { hasSvgAccessibleNameSource } from '../svg-helpers.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

/** U+00A0 NO-BREAK SPACE: not ASCII white space, though `String#trim` removes it. */
const NBSP = ' ';
/** Every character of ASCII white space. */
const ASCII_WHITESPACE = ' \t\n\f\r ';
/** U+000B is removed by `String#trim`, and is not ASCII white space. */
const VT = '\u000B';
const SVG = 'http://www.w3.org/2000/svg';

interface Case {
	readonly label: string;
	/** Builds the element and its resolver, with `text` as the value or the text that the source reads. */
	readonly build: (text: string) => { readonly el: AccnameElement; readonly resolver: AccnameResolver };
	readonly source: string;
	/** What the computation falls back to when the source is ASCII white space only; no name when absent. */
	readonly fallback?: { readonly name: string; readonly source: string };
}

const NAME_FROM_CONTENT = new Set(['button', 'legend', 'caption', 'span', 'label', 'h1']);

function plain(el: AccnameElement) {
	return { el, resolver: createTestResolver({ nameFromContent: NAME_FROM_CONTENT }) };
}

const CASES: readonly Case[] = [
	{
		label: 'aria-label',
		build: text => plain(element('div', { attrs: { 'aria-label': text } })),
		source: 'aria-label',
	},
	{
		label: 'a text that aria-labelledby refers to',
		build: text => {
			const ref = element('span', { attrs: { id: 't' }, children: [textNode(text)] });
			const el = element('button', { attrs: { 'aria-labelledby': 't' } });
			return {
				el,
				resolver: createTestResolver({ elements: new Map([['t', ref]]), nameFromContent: NAME_FROM_CONTENT }),
			};
		},
		source: 'aria-labelledby',
	},
	{
		label: 'the content of a button',
		build: text => plain(element('button', { children: [textNode(text)] })),
		source: 'content',
	},
	{
		label: 'title',
		build: text => plain(element('div', { attrs: { title: text } })),
		source: 'title',
	},
	{
		label: 'title of a button that has no content',
		build: text => plain(element('button', { attrs: { title: text } })),
		source: 'title',
	},
	{
		label: 'alt of img',
		build: text => plain(element('img', { attrs: { alt: text } })),
		source: 'alt',
	},
	{
		label: 'alt of area',
		build: text => plain(element('area', { attrs: { alt: text } })),
		source: 'alt',
	},
	{
		label: 'alt of input[type=image]',
		build: text => plain(element('input', { attrs: { type: 'image', alt: text } })),
		source: 'alt',
		fallback: { name: 'Submit Query', source: 'default' },
	},
	{
		label: 'value of input[type=button]',
		build: text => plain(element('input', { attrs: { type: 'button', value: text } })),
		source: 'value',
	},
	{
		label: 'placeholder of input',
		build: text => plain(element('input', { attrs: { type: 'text', placeholder: text } })),
		source: 'placeholder',
	},
	{
		label: 'the legend of a fieldset',
		build: text => plain(element('fieldset', { children: [element('legend', { children: [textNode(text)] })] })),
		source: 'legend',
	},
	{
		label: 'the caption of a table',
		build: text => plain(element('table', { children: [element('caption', { children: [textNode(text)] })] })),
		source: 'caption',
	},
	{
		label: 'the content of a summary',
		build: text => plain(element('summary', { children: [textNode(text)] })),
		source: 'content',
	},
	{
		label: 'the content of a link',
		build: text => plain(element('a', { attrs: { href: '/p' }, children: [textNode(text)] })),
		source: 'content',
	},
	{
		label: 'the title of an SVG',
		build: text =>
			plain(
				element('svg', {
					namespaceURI: SVG,
					children: [element('title', { namespaceURI: SVG, children: [textNode(text)] })],
				}),
			),
		source: 'svg-title',
	},
	{
		label: 'a label of an input',
		build: text => {
			const input = element('input', { attrs: { id: 'i', type: 'text' } });
			const label = element('label', { attrs: { for: 'i' }, children: [textNode(text)] });
			return {
				el: input,
				resolver: createTestResolver({ labels: new Map([['i', [label]]]), nameFromContent: NAME_FROM_CONTENT }),
			};
		},
		source: 'label',
	},
	{
		label: 'the text of the first option of a select, read by a label',
		build: text => {
			const select = element('select', { children: [element('option', { children: [textNode(text)] })] });
			return plain(element('h1', { children: [select] }));
		},
		source: 'content',
	},
	{
		label: 'the text of the selected option of a select, read by a label',
		build: text => {
			const select = element('select', {
				children: [
					element('option', { children: [textNode('x')] }),
					element('option', { attrs: { selected: '' }, children: [textNode(text)] }),
				],
			});
			return plain(element('h1', { children: [select] }));
		},
		source: 'content',
	},
	...['aria-valuetext', 'aria-valuenow', 'value'].map((attr): Case => ({
		label: `${attr} of a range control embedded in a label`,
		build: text => {
			const control = element('div', {
				attrs: { role: 'slider', [attr]: text },
				children: [textNode('fallback')],
			});
			const label = element('label', { children: [control] });
			const el = element('button', { attrs: { 'aria-labelledby': 'l' } });
			return {
				el,
				resolver: createTestResolver({
					elements: new Map([['l', label]]),
					nameFromContent: NAME_FROM_CONTENT,
					embeddedControlRoles: new Set(['slider']),
				}),
			};
		},
		source: 'aria-labelledby',
		fallback: { name: 'fallback', source: 'aria-labelledby' },
	})),
];

describe('a source of non-ASCII white space only is a name', () => {
	test.each(CASES)('$label', ({ build, source }) => {
		const { el, resolver } = build(NBSP);
		expect(computeAccessibleName(el, resolver)).toStrictEqual({ name: NBSP, source });
	});

	test('aria-labelledby that refers to a text of U+00A0 only overrides aria-label', () => {
		const ref = element('span', { attrs: { id: 't' }, children: [textNode(NBSP)] });
		const el = element('button', { attrs: { 'aria-label': 'Save', 'aria-labelledby': 't' } });
		const resolver = createTestResolver({
			elements: new Map([['t', ref]]),
			nameFromContent: NAME_FROM_CONTENT,
		});
		expect(computeAccessibleName(el, resolver)).toStrictEqual({ name: NBSP, source: 'aria-labelledby' });
	});
});

describe('a source of ASCII white space only is not a name', () => {
	test.each(CASES)('$label', ({ build, fallback }) => {
		const { el, resolver } = build(ASCII_WHITESPACE);
		expect(computeAccessibleName(el, resolver)).toStrictEqual(fallback ?? { name: '', source: null });
	});
});

describe('U+000B is not ASCII white space', () => {
	test('aria-label of U+000B only is a name', () => {
		const el = element('div', { attrs: { 'aria-label': VT } });
		expect(computeAccessibleName(el, createTestResolver())).toStrictEqual({ name: VT, source: 'aria-label' });
	});
});

describe('flattenText', () => {
	test('folds ASCII white space and keeps the non-ASCII one', () => {
		expect(flattenText(` \t\n\f\ra \r\n${NBSP} ﻿\t\tb\n `)).toBe(`a ${NBSP} ﻿ b`);
	});

	test('keeps a run of U+00A0 as it is', () => {
		expect(flattenText(`Save${NBSP}${NBSP}now`)).toBe(`Save${NBSP}${NBSP}now`);
	});

	test('keeps U+000B', () => {
		expect(flattenText(`${VT}a${VT}`)).toBe(`${VT}a${VT}`);
	});
});

describe('hasSvgAccessibleNameSource', () => {
	test.each([
		['aria-label', (text: string) => element('svg', { namespaceURI: SVG, attrs: { 'aria-label': text } })],
		[
			'aria-labelledby',
			(text: string) => element('svg', { namespaceURI: SVG, attrs: { 'aria-labelledby': text } }),
		],
		[
			'title',
			(text: string) =>
				element('svg', {
					namespaceURI: SVG,
					children: [element('title', { namespaceURI: SVG, children: [textNode(text)] })],
				}),
		],
		[
			'desc',
			(text: string) =>
				element('svg', {
					namespaceURI: SVG,
					children: [element('desc', { namespaceURI: SVG, children: [textNode(text)] })],
				}),
		],
	])('%s of U+00A0 only is a source, and of ASCII white space only is not', (_name, build) => {
		expect(hasSvgAccessibleNameSource(build(NBSP))).toBe(true);
		expect(hasSvgAccessibleNameSource(build(ASCII_WHITESPACE))).toBe(false);
	});
});
