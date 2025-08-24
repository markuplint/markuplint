import type { ARIAVersion } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getPermittedRoles } from './get-permitted-roles-spec.js';

function c(html: string, version: ARIAVersion, selector?: string) {
	const el = createJSDOMElement(html, selector);
	const roles = getPermittedRoles(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		selector => createSelector(selector, specs).match(el) !== false,
	);
	if (Array.isArray(roles)) {
		return roles.map(r => r.name);
	}
	return roles;
}

const coreRoles = [
	'alert',
	'alertdialog',
	'application',
	'article',
	'banner',
	'blockquote',
	'button',
	'caption',
	'cell',
	'checkbox',
	'code',
	'columnheader',
	'combobox',
	'complementary',
	'contentinfo',
	'definition',
	'deletion',
	'dialog',
	'directory',
	'document',
	'emphasis',
	'feed',
	'figure',
	'form',
	'generic',
	'grid',
	'gridcell',
	'group',
	'heading',
	'img',
	'insertion',
	'link',
	'list',
	'listbox',
	'listitem',
	'log',
	'main',
	'marquee',
	'math',
	'menu',
	'menubar',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'meter',
	'navigation',
	'none',
	'note',
	'option',
	'paragraph',
	'presentation',
	'progressbar',
	'radio',
	'radiogroup',
	'region',
	'row',
	'rowgroup',
	'rowheader',
	'scrollbar',
	'search',
	'searchbox',
	'separator',
	'slider',
	'spinbutton',
	'status',
	'strong',
	'subscript',
	'superscript',
	'switch',
	'tab',
	'table',
	'tablist',
	'tabpanel',
	'term',
	'textbox',
	'time',
	'timer',
	'toolbar',
	'tooltip',
	'tree',
	'treegrid',
	'treeitem',
];

describe('getPermittedRoles', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toStrictEqual(coreRoles);
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
		expect(c('<area></area>', '1.2')).toStrictEqual(['generic', 'button', 'link']);
		expect(c('<area></area>', '1.1')).toStrictEqual([]);
		expect(c('<area href="path/to"></area>', '1.2')).toStrictEqual(['link']);
	});

	test('the figure element', () => {
		expect(c('<figure></figure>', '1.2')).toStrictEqual(coreRoles);
		expect(c('<figure><figcaption></figcaption></figure>', '1.2')).toStrictEqual(['figure']);
	});

	test('the img element', () => {
		expect(c('<img>', '1.2')).toStrictEqual(['img']);
		expect(c('<img alt="">', '1.2')).toStrictEqual(['none', 'presentation']);
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
		expect(c('<img alt />', '1.2')).toStrictEqual(['none', 'presentation']);
		expect(c('<img alt="" />', '1.2')).toStrictEqual(['none', 'presentation']);
		expect(c('<img alt="foo" />', '1.2')).toStrictEqual(imgPermitted);
		expect(c('<img aria-label="foo" />', '1.2')).toStrictEqual(imgPermitted);
	});

	test('the form element', () => {
		expect(c('<form></form>', '1.2')).toStrictEqual(['none', 'presentation', 'search']);
		expect(c('<form></form>', '1.1')).toStrictEqual(['none', 'presentation', 'search']);
		expect(c('<form aria-label="foo"></form>', '1.2')).toStrictEqual(['form', 'none', 'presentation', 'search']);
		expect(c('<form aria-label="foo"></form>', '1.1')).toStrictEqual(['form', 'none', 'presentation', 'search']);
	});

	test('the svg element', () => {
		expect(c('<svg></svg>', '1.2')).toStrictEqual([
			'alert',
			'alertdialog',
			'application',
			'article',
			'banner',
			'blockquote',
			'button',
			'caption',
			'cell',
			'checkbox',
			'code',
			'columnheader',
			'combobox',
			'complementary',
			'contentinfo',
			'definition',
			'deletion',
			'dialog',
			'directory',
			'document',
			'emphasis',
			'feed',
			'figure',
			'form',
			'generic',
			'grid',
			'gridcell',
			'group',
			'heading',
			'img',
			'insertion',
			'link',
			'list',
			'listbox',
			'listitem',
			'log',
			'main',
			'marquee',
			'math',
			'menu',
			'menubar',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'meter',
			'navigation',
			'none',
			'note',
			'option',
			'paragraph',
			'presentation',
			'progressbar',
			'radio',
			'radiogroup',
			'region',
			'row',
			'rowgroup',
			'rowheader',
			'scrollbar',
			'search',
			'searchbox',
			'separator',
			'slider',
			'spinbutton',
			'status',
			'strong',
			'subscript',
			'superscript',
			'switch',
			'tab',
			'table',
			'tablist',
			'tabpanel',
			'term',
			'textbox',
			'time',
			'timer',
			'toolbar',
			'tooltip',
			'tree',
			'treegrid',
			'treeitem',
			'graphics-document',
			'graphics-object',
			'graphics-symbol',
		]);
	});

	test('the rect element', () => {
		expect(c('<svg><rect></rect></svg>', '1.2')).toStrictEqual([
			'alert',
			'alertdialog',
			'application',
			'article',
			'banner',
			'blockquote',
			'button',
			'caption',
			'cell',
			'checkbox',
			'code',
			'columnheader',
			'combobox',
			'complementary',
			'contentinfo',
			'definition',
			'deletion',
			'dialog',
			'directory',
			'document',
			'emphasis',
			'feed',
			'figure',
			'form',
			'generic',
			'grid',
			'gridcell',
			'group',
			'heading',
			'img',
			'insertion',
			'link',
			'list',
			'listbox',
			'listitem',
			'log',
			'main',
			'marquee',
			'math',
			'menu',
			'menubar',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'meter',
			'navigation',
			'none',
			'note',
			'option',
			'paragraph',
			'presentation',
			'progressbar',
			'radio',
			'radiogroup',
			'region',
			'row',
			'rowgroup',
			'rowheader',
			'scrollbar',
			'search',
			'searchbox',
			'separator',
			'slider',
			'spinbutton',
			'status',
			'strong',
			'subscript',
			'superscript',
			'switch',
			'tab',
			'table',
			'tablist',
			'tabpanel',
			'term',
			'textbox',
			'time',
			'timer',
			'toolbar',
			'tooltip',
			'tree',
			'treegrid',
			'treeitem',
			'graphics-document',
			'graphics-object',
			'graphics-symbol',
		]);
	});
});
