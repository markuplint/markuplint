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

const dpubRoles = [
	'doc-abstract',
	'doc-acknowledgments',
	'doc-afterword',
	'doc-appendix',
	'doc-backlink',
	'doc-biblioentry',
	'doc-bibliography',
	'doc-biblioref',
	'doc-chapter',
	'doc-colophon',
	'doc-conclusion',
	'doc-cover',
	'doc-credit',
	'doc-credits',
	'doc-dedication',
	'doc-endnote',
	'doc-endnotes',
	'doc-epigraph',
	'doc-epilogue',
	'doc-errata',
	'doc-example',
	'doc-footnote',
	'doc-foreword',
	'doc-glossary',
	'doc-glossref',
	'doc-index',
	'doc-introduction',
	'doc-noteref',
	'doc-notice',
	'doc-pagebreak',
	'doc-pagefooter',
	'doc-pageheader',
	'doc-pagelist',
	'doc-part',
	'doc-preface',
	'doc-prologue',
	'doc-pullquote',
	'doc-qna',
	'doc-subtitle',
	'doc-tip',
	'doc-toc',
];

const anyRoles = [...coreRoles, ...dpubRoles];

describe('getPermittedRoles', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toStrictEqual(anyRoles);
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
		// Per ARIA in HTML §3.4 `area (with href)`: "No role permitted".
		expect(c('<area href="path/to"></area>', '1.2')).toStrictEqual([]);
	});

	test('the figure element', () => {
		expect(c('<figure></figure>', '1.2')).toStrictEqual(anyRoles);
		// Per ARIA in HTML §3.4 `figure (with figcaption)`: "No role permitted".
		expect(c('<figure><figcaption></figcaption></figure>', '1.2')).toStrictEqual([]);
	});

	test('the img element', () => {
		// Per ARIA in HTML §3.4: `<img>` without alt and without another accessible
		// name has "No role permitted" — no explicit role attribute is allowed.
		expect(c('<img>', '1.2')).toStrictEqual([]);
		// Per ARIA in HTML §3.4: "No role permitted" when alt="" — implicit role
		// presentation/none is NOT a permitted explicit role.
		expect(c('<img alt="">', '1.2')).toStrictEqual([]);
		expect(c('<img alt="photo: something">', '1.2')).toStrictEqual([
			'img',
			'button',
			'checkbox',
			'link',
			'math',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'meter',
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
			'gridcell',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
		expect(c('<input type="button">', '1.1')).toStrictEqual([
			'button',
			'checkbox',
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

	test('the input element — reset, submit, image (#3588)', () => {
		// input[type=reset] — same permitted roles as button element
		expect(c('<input type="reset">', '1.2')).toStrictEqual([
			'button',
			'checkbox',
			'combobox',
			'gridcell',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
		expect(c('<input type="reset">', '1.1')).toStrictEqual([
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);

		// input[type=submit] — same permitted roles as button element
		expect(c('<input type="submit">', '1.2')).toStrictEqual([
			'button',
			'checkbox',
			'combobox',
			'gridcell',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
		expect(c('<input type="submit">', '1.1')).toStrictEqual([
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);

		// input[type=image] — same as button but WITHOUT combobox
		expect(c('<input type="image">', '1.2')).toStrictEqual([
			'button',
			'checkbox',
			'gridcell',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
		expect(c('<input type="image">', '1.1')).toStrictEqual([
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);
	});

	test('the img element', () => {
		const imgPermitted = [
			'img',
			'button',
			'checkbox',
			'link',
			'math',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'meter',
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
		// Per ARIA in HTML §3.4: `<img>` without alt and without another accessible
		// name has "No role permitted". Same for alt / alt="".
		expect(c('<img />', '1.2')).toStrictEqual([]);
		expect(c('<img alt />', '1.2')).toStrictEqual([]);
		expect(c('<img alt="" />', '1.2')).toStrictEqual([]);
		expect(c('<img alt="foo" />', '1.2')).toStrictEqual(imgPermitted);
		expect(c('<img aria-label="foo" />', '1.2')).toStrictEqual(imgPermitted);
	});

	test('the img element (1.3: image/img synonym)', () => {
		// In ARIA 1.3, `image` and `img` are synonyms. Without alt and without
		// another accessible name, "No role permitted" still applies.
		expect(c('<img />', '1.3')).toStrictEqual([]);
		expect(c('<img alt />', '1.3')).toStrictEqual([]);
		expect(c('<img alt="" />', '1.3')).toStrictEqual([]);
		const permitted13 = c('<img alt="foo" />', '1.3');
		expect(permitted13).toContain('img');
		expect(permitted13).toContain('image');
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

	// Per ARIA in HTML §3.4: when `permittedRoles: false` applies, NO explicit role
	// is permitted — not even a value matching the implicit role. Coverage for Issue
	// #3641 impact on elements beyond <img>.
	describe('permittedRoles: false forbids all explicit role values', () => {
		// Elements whose top-level `permittedRoles: false` combined with a non-false
		// implicit role used to allow that implicit value as explicit. After the fix,
		// none of these are permitted.
		test.each([
			{ html: '<progress></progress>', implicit: 'progressbar' },
			{ html: '<textarea></textarea>', implicit: 'textbox' },
			// <select multiple> triggers the listbox conditional.
			{ html: '<select multiple></select>', implicit: 'listbox' },
			{ html: '<summary></summary>', implicit: 'button' },
			{ html: '<main></main>', implicit: 'main' },
			{ html: '<details></details>', implicit: 'group' },
			{ html: '<meter>50%</meter>', implicit: 'meter' },
		])('$html (implicit=$implicit) → [] in 1.2', ({ html }) => {
			expect(c(html, '1.2')).toStrictEqual([]);
		});

		// input type variants that have `permittedRoles: false` via conditionals.
		// Some set `implicitRole: false` as well (truly no role), others retain
		// an implicit role — either way, explicit role is forbidden.
		test.each([
			'<input type="email">',
			'<input type="number">',
			'<input type="password">',
			'<input type="file">',
			'<input type="hidden">',
			'<input type="date">',
			'<input type="color">',
			'<input type="datetime-local">',
		])('%s → [] in 1.2', html => {
			expect(c(html, '1.2')).toStrictEqual([]);
		});

		// <area href> is a hyperlink per ARIA in HTML with "No role permitted".
		test('<area href>', () => {
			expect(c('<area href="path/to"></area>', '1.2')).toStrictEqual([]);
		});

		// Elements with `implicitRole: false` + `permittedRoles: false` were already
		// returning [] before the fix — these guard against regressions in the other
		// direction (must still be []).
		test.each(['<meta>', '<label>label</label>', '<legend>legend</legend>'])(
			'%s remains [] (regression guard)',
			html => {
				expect(c(html, '1.2')).toStrictEqual([]);
			},
		);
	});

	// Regression guard for R3: when `permittedRoles` is undefined (not set) on an
	// element's aria spec — distinct from `false` — the implicit role should still
	// be appended. `<form>` without aria-label uses the `:not(:aria(has name))`
	// conditional which sets permittedRoles to an array (not undefined/false); the
	// top-level form spec sets permittedRoles: true. Here we rely on the form test
	// above to exercise the `true` branch and on the img[alt="foo"] test to exercise
	// the array branch. No production element in html-spec currently leaves
	// permittedRoles undefined on an aria spec that reaches getPermittedRoles.
});
