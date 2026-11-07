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
