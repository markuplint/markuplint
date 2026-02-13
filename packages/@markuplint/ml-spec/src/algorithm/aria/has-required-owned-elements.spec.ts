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
