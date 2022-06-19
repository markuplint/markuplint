import type { ARIAVersion } from '../types';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';

import { getPermittedRoles } from './get-permitted-roles';

function c(html: string, version: ARIAVersion) {
	const el = createJSDOMElement(html);
	return getPermittedRoles(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		selector => !!createSelector(selector, specs).match(el),
	);
}

describe('getPermittedRoles', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toBe(true);
		expect(c('<a href="path/to"></a>', '1.2')).toStrictEqual([
			'link',
			'button',
			'checkbox',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
			'treeitem',
		]);
	});

	test('the area element', () => {
		expect(c('<area></area>', '1.2')).toStrictEqual(['button', 'link']);
		expect(c('<area></area>', '1.1')).toBe(false);
		expect(c('<area href="path/to"></area>', '1.2')).toStrictEqual(['link']);
	});

	test('the figure element', () => {
		expect(c('<figure></figure>', '1.2')).toBe(true);
		expect(c('<figure><figcaption></figcaption></figure>', '1.2')).toStrictEqual(['figure']);
	});

	test('the img element', () => {
		expect(c('<img>', '1.2')).toStrictEqual(['img']);
		expect(c('<img alt="">', '1.2')).toStrictEqual(['presentation']);
		expect(c('<img alt="photo: something">', '1.2')).toStrictEqual([
			'img',
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'progressbar',
			'radio',
			'scrollbar',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
		expect(c('<img alt="photo: something">', '1.1')).toStrictEqual([
			'img',
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'progressbar',
			'scrollbar',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
	});

	test('the input element', () => {
		expect(c('<input>', '1.2')).toStrictEqual(['textbox', 'combobox', 'searchbox', 'spinbutton']);
		expect(c('<input>', '1.1')).toStrictEqual(['textbox', 'combobox', 'searchbox', 'spinbutton']);
		expect(c('<input type="button">', '1.2')).toStrictEqual([
			'button',
			'checkbox',
			'combobox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);
		expect(c('<input type="button">', '1.1')).toStrictEqual([
			'button',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);
		expect(c('<input type="checkbox" aria-pressed="true">', '1.2')).toStrictEqual(['checkbox', 'button']);
	});

	test('the img element', () => {
		const imgPermitted = [
			'img',
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'progressbar',
			'radio',
			'scrollbar',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		];
		expect(c('<img />', '1.2')).toStrictEqual(['img']);
		expect(c('<img alt />', '1.2')).toStrictEqual(['presentation']);
		expect(c('<img alt="" />', '1.2')).toStrictEqual(['presentation']);
		expect(c('<img alt="foo" />', '1.2')).toStrictEqual(imgPermitted);
		expect(c('<img aria-label="foo" />', '1.2')).toStrictEqual(imgPermitted);
	});

	test('the form element', () => {
		expect(c('<form></form>', '1.2')).toStrictEqual(['form', 'none', 'presentation', 'search']);
		expect(c('<form></form>', '1.1')).toStrictEqual(['none', 'presentation', 'search']);
		expect(c('<form aria-label="foo"></form>', '1.2')).toStrictEqual(['form', 'none', 'presentation', 'search']);
		expect(c('<form aria-label="foo"></form>', '1.1')).toStrictEqual(['form', 'none', 'presentation', 'search']);
	});
});
