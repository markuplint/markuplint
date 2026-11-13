import type { SelectorElement } from '@markuplint/selector';

import specs from '@markuplint/html-spec';
import { contentModelFirstChildBase, isContentModelFirstChild, isInterElementWhitespace } from '@markuplint/selector';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

describe('isInterElementWhitespace', () => {
	test.each([
		['', true],
		[' \t\n\f\r', true],
		['&#x20;&#X0A;&#9;&#10;&#13;&#32;', true],
		['&Tab;&NewLine;', true],
		['\u00A0', false],
		['&nbsp;', false],
		['\v', false],
		['&#x21;', false],
		['&#10 &#x20', true],
		['&#109', false],
		['&#x9a', false],
		['&Tab', false],
		['text', false],
	])('%j → %s', (data, expected) => {
		expect(isInterElementWhitespace(data)).toBe(expected);
	});
});

describe('isContentModelFirstChild', () => {
	test.each([
		['<div><style></style></div>', true],
		['<div>\n\t<!-- comment -->\n<style></style></div>', true],
		['<div>\r\n<style></style></div>', true],
		['<div>\f<style></style></div>', true],
		['<div>text<style></style></div>', false],
		['<div>\u00A0<style></style></div>', false],
		['<div>\v<style></style></div>', false],
		['<div><p></p><style></style></div>', false],
		['<div><p></p>\n<style></style></div>', false],
	])('%j → %s', (html, expected) => {
		expect(isContentModelFirstChild(elementOf(html, 'style'))).toBe(expected);
	});

	test('a host that gives the text as written counts a character reference to whitespace as whitespace', () => {
		const text = { nodeType: 3, nodeName: '#text', parent: null, nodeValue: '&#x20;', prevSibling: null };
		const el = { prevElementSibling: null, prevSibling: text } as unknown as SelectorElement;
		expect(isContentModelFirstChild(el)).toBe(true);
	});

	test('a host without prevSibling is judged by the elements alone', () => {
		const el = { prevElementSibling: null } as unknown as SelectorElement;
		expect(isContentModelFirstChild(el)).toBe(true);
	});
});

describe('contentModelFirstChildBase', () => {
	test.each([
		['style:first-child', 'style'],
		['style', null],
		['a[href]', null],
		['hgroup:has(h1,h2,h3,h4,h5,h6)', null],
		[':not(:first-child)', null],
		['div:has(> p:first-child)', null],
		['p + style:first-child', null],
		[':first-child', null],
	])('%j → %j', (entry, expected) => {
		expect(contentModelFirstChildBase(entry)).toBe(expected);
	});

	test('every entry of the html-spec categories that has :first-child has it at the end of a compound selector', () => {
		const entries = Object.values(specs.def['#contentModels']).flat();
		const misplaced = entries.filter(
			entry => entry.includes(':first-child') && contentModelFirstChildBase(entry) === null,
		);
		expect(misplaced).toStrictEqual([]);
		expect(entries).toContain('style:first-child');
	});
});
