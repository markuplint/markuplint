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

describe('matchesOwnedRole', () => {
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
});
