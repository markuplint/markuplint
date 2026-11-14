import type { ARIAVersion } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { hasRequiredOwnedElement } from './has-required-owned-elements.js';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

function m(html: string, version: ARIAVersion, selector?: string) {
	const el = _(html, selector);
	return hasRequiredOwnedElement(el, specs, version);
}

describe('1.2', () => {
	test('rowgroup > row', () => {
		expect(m('<table><tbody><tr><td></td></tr></tbody></table>', '1.2')).toBe(true);
	});
	test('row', () => {
		expect(m('<table><tr><td></td></tr></table>', '1.2', 'tr')).toBe(true);
	});
	test('list > listitem', () => {
		expect(m('<ul><li></li></ul>', '1.2')).toBe(true);
		expect(m('<ul><div><li></li></div></ul>', '1.2')).toBe(false);
		expect(m('<ul><div role="none"><li></li></div></ul>', '1.2')).toBe(true);
		expect(
			m('<ul><div role="none"><div role="none"><div role="none"><li></li></div></div></div></ul>', '1.2'),
		).toBe(true);
	});
	test('generic role is NOT transparent in 1.2', () => {
		// In ARIA 1.2, div (generic role) is NOT transparent for ownership
		expect(m('<ul><div><li></li></div></ul>', '1.2')).toBe(false);
	});
});

describe('1.3', () => {
	test('rowgroup > row', () => {
		expect(m('<table><tbody><tr><td></td></tr></tbody></table>', '1.3')).toBe(true);
	});
	test('row', () => {
		expect(m('<table><tr><td></td></tr></table>', '1.3', 'tr')).toBe(true);
	});
	test('list > listitem with presentational wrapper', () => {
		expect(m('<ul><li></li></ul>', '1.3')).toBe(true);
		expect(m('<ul><div role="none"><li></li></div></ul>', '1.3')).toBe(true);
		expect(
			m('<ul><div role="none"><div role="none"><div role="none"><li></li></div></div></div></ul>', '1.3'),
		).toBe(true);
	});
	test('generic role IS transparent in 1.3', () => {
		// In ARIA 1.3, div (generic role) is transparent for ownership traversal
		expect(m('<ul><div><li></li></div></ul>', '1.3')).toBe(true);
	});
	test('nested generic elements are transparent in 1.3', () => {
		expect(m('<ul><div><div><li></li></div></div></ul>', '1.3')).toBe(true);
		expect(m('<ul><div><div><div><li></li></div></div></div></ul>', '1.3')).toBe(true);
	});
	test('non-generic, non-presentational role is NOT transparent in 1.3', () => {
		// group role is NOT transparent
		expect(m('<ul><div role="group"><li></li></div></ul>', '1.3')).toBe(false);
	});
	test('span (generic) is transparent in 1.3', () => {
		expect(m('<ul><span><li></li></span></ul>', '1.3')).toBe(true);
	});
});

describe('aria-owns', () => {
	const listbox = '[role="listbox"]';

	test('an element that aria-owns refers to is owned', () => {
		expect(m('<div role="listbox" aria-owns="o"></div><div id="o" role="option"></div>', '1.3', listbox)).toBe(
			true,
		);
	});

	test('an aria-owns that refers to no element owns nothing', () => {
		expect(m('<div role="listbox" aria-owns="nonexistent"></div>', '1.3', listbox)).toBe(false);
	});

	test('an aria-owns that refers to an element with another role does not satisfy the constraint', () => {
		expect(m('<div role="listbox" aria-owns="l"></div><div id="l" role="listitem"></div>', '1.3', listbox)).toBe(
			false,
		);
	});

	test('a generic that aria-owns refers to is transparent in 1.3', () => {
		expect(
			m('<div role="listbox" aria-owns="g"></div><div id="g"><div role="option"></div></div>', '1.3', listbox),
		).toBe(true);
	});

	test('a child that another element owns through aria-owns is not owned by its parent', () => {
		expect(
			m(
				'<div role="listbox"><div id="o" role="option"></div></div><div role="group" aria-owns="o"></div>',
				'1.3',
				listbox,
			),
		).toBe(false);
	});
});
