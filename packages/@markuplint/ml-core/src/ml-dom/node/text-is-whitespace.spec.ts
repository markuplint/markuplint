import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * A text of ASCII white space only is inter-element whitespace for HTML.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace
 */
describe('MLText#isWhitespace', () => {
	function textOf(code: string) {
		const text = createTestDocument(code).querySelector('div')?.childNodes[0];
		if (!text?.is(text.TEXT_NODE)) {
			throw new Error('The first child is not a text node');
		}
		return text;
	}

	test.each([' ', '\t', '\n', '\f', '\r', ' \t\n\f\r '])('is true for the ASCII white space %j', value => {
		expect(textOf(`<div>${value}</div>`).isWhitespace()).toBe(true);
	});

	test.each(['\u00A0', '\uFEFF', '\u2028', '\u2003', '\u3000', '\v', ' \u00A0 '])(
		'is false for the non-ASCII white space %j',
		value => {
			expect(textOf(`<div>${value}</div>`).isWhitespace()).toBe(false);
		},
	);

	test.each([
		['&nbsp;', false],
		['&#xA0;', false],
		['&#32;', true],
	])('for the character reference %j, which is decoded as the DOM has it, is %j', (value, whitespace) => {
		expect(textOf(`<div>${value}</div>`).isWhitespace()).toBe(whitespace);
	});

	test('is false for a text that has a character', () => {
		expect(textOf('<div> a </div>').isWhitespace()).toBe(false);
	});

	test('is false for an empty text', () => {
		// No parser emits a text node of nothing, so the node is one of white space whose `raw` is replaced
		const text = textOf('<div> </div>');
		Object.defineProperty(text, 'raw', { value: '' });
		expect(text.isWhitespace()).toBe(false);
	});
});

describe('MLElement#getChildElementsAndTextNodeWithoutWhitespaces', () => {
	test('drops a text of ASCII white space and keeps a text of U+00A0', () => {
		const div = createTestDocument('<div> <b></b>\u00A0<i></i>\n</div>').querySelector('div');
		expect(div?.getChildElementsAndTextNodeWithoutWhitespaces().map(node => node.raw)).toStrictEqual([
			'<b>',
			'\u00A0',
			'<i>',
		]);
	});
});
