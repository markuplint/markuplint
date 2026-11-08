import specs from '@markuplint/html-spec';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { createSelector } from './create-selector.js';

function c(selector: string, html: string) {
	return createSelector(selector, specs).match(createJSDOMElement(html));
}

describe('Extended Selector', () => {
	test(':aria', () => {
		expect(c(':aria(has name)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.2)', '<button>foo</button>')).toBeTruthy();
	});

	test(':role', () => {
		expect(c(':role(button)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div role="button">foo</div>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div>foo</div>')).toBeFalsy();
	});

	test(':model', () => {
		expect(c(':model(flow)', '<a></a>')).toBeTruthy();
		expect(c(':model(interactive)', '<a></a>')).toBeFalsy();
		expect(c(':model(interactive)', '<a href="path/to"></a>')).toBeTruthy();
		expect(c(':not(:model(interactive))', '<a href="path/to"></a>')).toBeFalsy();
	});

	test.each([
		['<div>\n<!-- c --><style></style></div>', 'style', true],
		['<div><p></p><style></style></div>', 'style', false],
		['<div>text<style></style></div>', 'style', false],
		['<div>\u00A0<style></style></div>', 'style', false],
		['<div>text<p></p></div>', 'p', true],
	])(
		':model(flow) matches a style element only as the first child of its parent, as the HTML Standard counts it: %j',
		(html, target, expected) => {
			const el = createJSDOMElement(html, target);
			expect(createSelector(':model(flow)', specs).match(el) !== false).toBe(expected);
			expect(createSelector(':not(:model(flow))', specs).match(el) !== false).toBe(!expected);
		},
	);

	test('style:first-child written as a selector keeps the Selectors definition, which does not count text', () => {
		const el = createJSDOMElement('<div>text<style></style></div>', 'style');
		expect(createSelector('style:first-child', specs).match(el)).toBeTruthy();
		const afterElement = createJSDOMElement('<div><p></p><style></style></div>', 'style');
		expect(createSelector('style:first-child', specs).match(afterElement)).toBe(false);
	});

	test(':model matches #custom only for an element that reports isCustomElement', () => {
		const plain = createJSDOMElement('<x-foo></x-foo>');
		const custom = Object.defineProperty(createJSDOMElement('<x-foo></x-foo>'), 'isCustomElement', {
			value: true,
		});
		expect(createSelector(':model(flow)', specs).match(plain)).toBeFalsy();
		expect(createSelector(':model(flow)', specs).match(custom)).toBeTruthy();
		expect(createSelector(':model(interactive)', specs).match(custom)).toBeFalsy();
	});

	test('The address element', () => {
		const contentModel =
			':model(flow):not(address, :model(heading), :model(sectioning), header, footer, :has(address, :model(heading), :model(sectioning), header, footer))';
		expect(c(contentModel, '<a></a>')).toBeTruthy();
		expect(c(contentModel, '<h1></h1>')).toBeFalsy();
		expect(c(contentModel, '<address></address>')).toBeFalsy();
		expect(c(contentModel, '<header></header>')).toBeFalsy();
		expect(c(contentModel, '<div><a></a></div>')).toBeTruthy();
		expect(c(contentModel, '<div><h1></h1></div>')).toBeFalsy();
		expect(c(contentModel, '<div><address></address></div>')).toBeFalsy();
		expect(c(contentModel, '<div><header></header></div>')).toBeFalsy();
	});
});

describe(':display-size', () => {
	function select(html: string, selector: string) {
		return createSelector(selector, specs).match(createJSDOMElement(html, 'select')) !== false;
	}

	test.each([
		['<select></select>', ':display-size(= 1)', true],
		['<select></select>', ':display-size(> 1)', false],
		['<select multiple></select>', ':display-size(= 4)', true],
		['<select multiple></select>', ':display-size(> 1)', true],
		['<select size="2"></select>', ':display-size(> 1)', true],
		['<select size="2"></select>', ':display-size(>= 2)', true],
		['<select size="2"></select>', ':display-size(< 2)', false],
		['<select size="2"></select>', ':display-size(<= 2)', true],
		['<select size="1"></select>', ':display-size(> 1)', false],
		['<select size="0"></select>', ':display-size(= 0)', true],
		['<select size="0"></select>', ':display-size(> 1)', false],
		['<select size="01"></select>', ':display-size(= 1)', true],
		['<select size="01"></select>', ':display-size(> 1)', false],
		['<select size="02"></select>', ':display-size(> 1)', true],
		['<select size=" 3"></select>', ':display-size(= 3)', true],
		['<select size="+3"></select>', ':display-size(= 3)', true],
		['<select size="3abc"></select>', ':display-size(= 3)', true],
		['<select size="-1"></select>', ':display-size(= 1)', true],
		['<select size="abc"></select>', ':display-size(> 1)', false],
		['<select size="abc"></select>', ':display-size(= 1)', true],
		['<select size="abc" multiple></select>', ':display-size(= 4)', true],
		['<select size=""></select>', ':display-size(= 1)', true],
	])('%s matches %s: %j', (html, selector, expected) => {
		expect(select(html, selector)).toBe(expected);
	});

	test('no spaces are needed around the operator', () => {
		expect(select('<select size="2"></select>', ':display-size(>1)')).toBe(true);
		expect(select('<select size="2"></select>', ':display-size(>=3)')).toBe(false);
	});

	test('combined with other selectors', () => {
		const selector = 'select:is([multiple], :display-size(> 1))';
		expect(select('<select></select>', selector)).toBe(false);
		expect(select('<select multiple></select>', selector)).toBe(true);
		expect(select('<select size="2"></select>', selector)).toBe(true);
		expect(select('<select size="1"></select>', selector)).toBe(false);
		expect(select('<select size="0"></select>', selector)).toBe(false);
	});

	test('works without the specs', () => {
		// The cache is keyed by the selector string: no other test uses `> 7`, so this is built without the specs
		const el = createJSDOMElement('<select size="8"></select>', 'select');
		expect(createSelector(':display-size(> 7)').match(el)).toBeTruthy();
		expect(createSelector(':display-size(> 8)').match(el)).toBe(false);
	});

	test('a number may have leading zeros', () => {
		expect(select('<select></select>', ':display-size(= 01)')).toBe(true);
		expect(select('<select size="2"></select>', ':display-size(> 001)')).toBe(true);
	});

	test('an element other than a select never matches', () => {
		const div = createJSDOMElement('<div size="2"></div>', 'div');
		expect(createSelector(':display-size(> 1)', specs).match(div)).toBe(false);
		expect(createSelector(':display-size(= 1)', specs).match(div)).toBe(false);
		const input = createJSDOMElement('<input size="2">', 'input');
		expect(createSelector(':display-size(> 1)', specs).match(input)).toBe(false);
	});

	test('a select in another namespace never matches', () => {
		const el = createJSDOMElement('<svg><select size="2"></select></svg>', 'select');
		expect(createSelector(':display-size(> 1)', specs).match(el)).toBe(false);
	});

	test.each([
		[':display-size()'],
		[':display-size(1)'],
		[':display-size(> )'],
		[':display-size(> a)'],
		[':display-size(=> 1)'],
		[':display-size(> -1)'],
		[':display-size(> 1.5)'],
	])('%s is a syntax error', selector => {
		expect(() => createSelector(selector, specs).match(createJSDOMElement('<select></select>', 'select'))).toThrow(
			SyntaxError,
		);
	});
});
