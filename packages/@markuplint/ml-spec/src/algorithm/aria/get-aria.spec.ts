import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getARIA } from './get-aria.js';

function a(html: string, version: '1.1' | '1.2' | '1.3', selector?: string) {
	const el = createJSDOMElement(html, selector);
	return getARIA(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		selector => createSelector(selector, specs).match(el) !== false,
	);
}

describe('getARIA — optimizePermittedRoles on conditions (#3724)', () => {
	test('base permittedRoles includes none/presentation synonyms', () => {
		// form base permittedRoles includes both "none" and "presentation"
		const aria = a('<form></form>', '1.2');
		expect(aria?.permittedRoles).toStrictEqual(expect.arrayContaining(['none', 'presentation']));
	});

	test('condition-specific permittedRoles sorted with synonyms applied', () => {
		// dl > div condition has permittedRoles: ["presentation", "none"]
		// optimizePermittedRoles should sort them → ["none", "presentation"]
		const aria = a('<dl><div></div></dl>', '1.2', 'div');
		expect(aria?.permittedRoles).toStrictEqual(['none', 'presentation']);
	});

	test('condition-specific permittedRoles sorted alphabetically', () => {
		// input[type=button] condition permittedRoles should be sorted
		const aria = a('<input type="button">', '1.2');
		expect(aria?.permittedRoles).toStrictEqual([
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
	});

	test('ARIA 1.3 image/img synonym applied to base permittedRoles', () => {
		// embed element base permittedRoles includes "img"
		// In 1.3, "image" should also appear (no-conditions early return path)
		// Note: no spec data currently has "img" in a condition-specific
		// permittedRoles, so only the base spec path is verified here.
		const aria = a('<embed>', '1.3');
		expect(aria?.permittedRoles).toStrictEqual(expect.arrayContaining(['img', 'image']));

		// In 1.2, "image" synonym should NOT be added
		const aria12 = a('<embed>', '1.2');
		expect(aria12?.permittedRoles).toContain('img');
		expect(aria12?.permittedRoles).not.toContain('image');
	});

	test('permittedRoles: false is passed through without optimization', () => {
		// input[type=color] condition sets permittedRoles: false
		const aria = a('<input type="color">', '1.2');
		expect(aria?.permittedRoles).toBe(false);
	});

	test('permittedRoles: true is passed through without optimization', () => {
		// div base permittedRoles is true (any role allowed)
		const aria = a('<div></div>', '1.2');
		expect(aria?.permittedRoles).toBe(true);
	});
});
