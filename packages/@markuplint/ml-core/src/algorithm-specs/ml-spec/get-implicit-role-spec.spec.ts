import type { ARIAVersion } from '@markuplint/ml-spec';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

import { getImplicitRoleByTagName as getImplicitRole } from '@markuplint/ml-spec';

function c(html: string, version: ARIAVersion, selector?: string) {
	const el = elementOf(html, selector);
	return getImplicitRole(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		sel => createSelector(sel, specs).match(el) !== false,
	);
}

describe('getImplicitRole', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.1')).toBe(false);
		expect(c('<a name="foo"></a>', '1.1')).toBe(false);
		expect(c('<a></a>', '1.2')).toBe('generic');
		expect(c('<a name="foo"></a>', '1.2')).toBe('generic');
		expect(c('<a href></a>', '1.2')).toBe('link');
		expect(c('<a href=""></a>', '1.2')).toBe('link');
		expect(c('<a href="path/to"></a>', '1.2')).toBe('link');
	});

	test('the area element', () => {
		expect(c('<area />', '1.2')).toBe('generic');
		expect(c('<area shape="rect" />', '1.2')).toBe('generic');
		expect(c('<area href />', '1.2')).toBe('link');
		expect(c('<area href="" />', '1.2')).toBe('link');
		expect(c('<area href="path/to" />', '1.2')).toBe('link');
	});

	test('the article element', () => {
		expect(c('<article></article>', '1.2')).toBe('article');
	});

	test('the aside element', () => {
		// ARIA 1.2: always complementary
		expect(c('<aside></aside>', '1.2')).toBe('complementary');
		expect(c('<article><aside></aside></article>', '1.2', 'aside')).toBe('complementary');
		// ARIA 1.3: conditional
		expect(c('<aside></aside>', '1.3')).toBe('complementary');
		expect(c('<article><aside></aside></article>', '1.3', 'aside')).toBe('generic');
		expect(c('<article><aside aria-label="sidebar"></aside></article>', '1.3', 'aside')).toBe('complementary');
		expect(c('<section><aside></aside></section>', '1.3', 'aside')).toBe('generic');
	});

	test('the audio element', () => {
		expect(c('<audio></audio>', '1.2')).toBe(false);
	});

	test('the h1 element', () => {
		expect(c('<h1></h1>', '1.2')).toBe('heading');
	});

	test('the header element', () => {
		expect(c('<header></header>', '1.2')).toBe('banner');
		expect(c('<header><article></article></header>', '1.2')).toBe('generic');
		expect(c('<header><article></article></header>', '1.1')).toBe(false);
		expect(c('<header><div></div></header>', '1.2')).toBe('banner');
		expect(c('<header><div role="article"></div></header>', '1.2')).toBe('generic');
		expect(c('<header><div role="article"></div></header>', '1.1')).toBe(false);
	});

	test('the img element', () => {
		expect(c('<img />', '1.2')).toBe('img');
		expect(c('<img alt />', '1.2')).toBe('presentation');
		expect(c('<img alt="" />', '1.2')).toBe('presentation');
		expect(c('<img alt="foo" />', '1.2')).toBe('img');
		expect(c('<img aria-label="foo" />', '1.2')).toBe('img');
	});

	test('the form element', () => {
		expect(c('<form></form>', '1.2')).toBe(false);
		expect(c('<form></form>', '1.1')).toBe(false);
		expect(c('<form aria-label="foo"></form>', '1.2')).toBe('form');
		expect(c('<form aria-label="foo"></form>', '1.1')).toBe('form');
	});

	test('the section element', () => {
		expect(c('<section></section>', '1.2')).toBe(false);
		expect(c('<section aria-label="foo"></section>', '1.2')).toBe('region');
	});

	test('the select element is a combobox unless it has the multiple attribute or a display size greater than 1', () => {
		expect(c('<select></select>', '1.2')).toBe('combobox');
		expect(c('<select size="1"></select>', '1.2')).toBe('combobox');
		expect(c('<select size="0"></select>', '1.2')).toBe('combobox');
		expect(c('<select size="01"></select>', '1.2')).toBe('combobox');
		expect(c('<select size="abc"></select>', '1.2')).toBe('combobox');
		expect(c('<select size="-1"></select>', '1.2')).toBe('combobox');
		expect(c('<select multiple></select>', '1.2')).toBe('listbox');
		expect(c('<select size="2"></select>', '1.2')).toBe('listbox');
		expect(c('<select size=" 2"></select>', '1.2')).toBe('listbox');
		expect(c('<select size="02"></select>', '1.2')).toBe('listbox');
		expect(c('<select size="2abc"></select>', '1.2')).toBe('listbox');
	});

	test('the select element is told by the native matches() as well, which cannot evaluate :display-size()', () => {
		const native = (html: string) => {
			const el = elementOf(html);
			return getImplicitRole(specs, el.localName, el.namespaceURI, '1.2', selector => el.matches(selector));
		};
		expect(native('<select></select>')).toBe('combobox');
		expect(native('<select size="1"></select>')).toBe('combobox');
		expect(native('<select multiple></select>')).toBe('listbox');
		expect(native('<select size="2"></select>')).toBe('listbox');
	});

	test('the select element with the multiple attribute is a listbox whatever its size is', () => {
		expect(c('<select multiple size="0"></select>', '1.2')).toBe('listbox');
		expect(c('<select multiple size="1"></select>', '1.2')).toBe('listbox');
		expect(c('<select multiple size="abc"></select>', '1.2')).toBe('listbox');
		expect(c('<select multiple size="3"></select>', '1.2')).toBe('listbox');
	});
});
