import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { getPermittedRoles } from './get-permitted-roles';

describe('getPermittedRoles', () => {
	test('the a element', () => {
		expect(getPermittedRoles(specs, createTestElement('<a></a>')!, '1.2')).toBe(true);
		expect(getPermittedRoles(specs, createTestElement('<a href="path/to"></a>')!, '1.2')).toStrictEqual([
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
		expect(getPermittedRoles(specs, createTestElement('<area></area>')!, '1.2')).toStrictEqual(['button', 'link']);
		expect(getPermittedRoles(specs, createTestElement('<area></area>')!, '1.1')).toBe(false);
		expect(getPermittedRoles(specs, createTestElement('<area href="path/to"></area>')!, '1.2')).toStrictEqual([
			'link',
		]);
	});

	test('the figure element', () => {
		expect(getPermittedRoles(specs, createTestElement('<figure></figure>')!, '1.2')).toBe(true);
		expect(
			getPermittedRoles(specs, createTestElement('<figure><figcaption></figcaption></figure>')!, '1.2'),
		).toStrictEqual(['figure']);
	});

	test('the img element', () => {
		expect(getPermittedRoles(specs, createTestElement('<img>')!, '1.2')).toStrictEqual(['img']);
		expect(getPermittedRoles(specs, createTestElement('<img alt="">')!, '1.2')).toStrictEqual(['presentation']);
		expect(getPermittedRoles(specs, createTestElement('<img alt="photo: something">')!, '1.2')).toStrictEqual([
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
		expect(getPermittedRoles(specs, createTestElement('<img alt="photo: something">')!, '1.1')).toStrictEqual([
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
		expect(getPermittedRoles(specs, createTestElement('<input>')!, '1.2')).toStrictEqual([
			'textbox',
			'combobox',
			'searchbox',
			'spinbutton',
		]);
		expect(getPermittedRoles(specs, createTestElement('<input>')!, '1.1')).toStrictEqual([
			'textbox',
			'combobox',
			'searchbox',
			'spinbutton',
		]);
		expect(getPermittedRoles(specs, createTestElement('<input type="button">')!, '1.2')).toStrictEqual([
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
		expect(getPermittedRoles(specs, createTestElement('<input type="button">')!, '1.1')).toStrictEqual([
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
		expect(
			getPermittedRoles(specs, createTestElement('<input type="checkbox" aria-pressed="true">')!, '1.2'),
		).toStrictEqual(['checkbox', 'button']);
	});
});
