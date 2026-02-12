import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { matchesContextRole } from './matches-context-role.js';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

describe('1.2', () => {
	const version = '1.2';

	test('rowgroup', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['rowgroup'], el, specs, version)).toBe(true);
	});

	test('rowgroup owned by table', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['table > rowgroup'], el, specs, version)).toBe(true);
	});

	test('no rowgroup', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['group'], el, specs, version)).toBe(false);
	});

	test('rowgroup owned by no table', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['grid > rowgroup'], el, specs, version)).toBe(false);
	});
});

describe('1.3', () => {
	const version = '1.3';

	test('rowgroup', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['rowgroup'], el, specs, version)).toBe(true);
	});

	test('rowgroup owned by table', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['table > rowgroup'], el, specs, version)).toBe(true);
	});

	test('no rowgroup', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['group'], el, specs, version)).toBe(false);
	});

	test('rowgroup owned by no table', () => {
		const el = _('<table><tbody><tr><td></td></tr></tbody></table>', 'tr');
		expect(matchesContextRole(['grid > rowgroup'], el, specs, version)).toBe(false);
	});

	test('generic role parent is transparent in 1.3', () => {
		// <div> has implicit role "generic" — should be skipped in 1.3
		const el = _('<ul><div><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
	});

	test('generic role parent is NOT transparent in 1.2', () => {
		const el = _('<ul><div><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, '1.2')).toBe(false);
	});

	test('nested generic parents are transparent in 1.3', () => {
		const el = _('<ul><div><div><li></li></div></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
	});

	test('non-generic role parent is NOT transparent in 1.3', () => {
		const el = _('<div role="list"><div role="group"><div role="listitem"></div></div></div>', '[role=listitem]');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(false);
	});

	test('generic parent with explicit role context in 1.3', () => {
		const el = _('<div role="listbox"><div><div role="option">Item</div></div></div>', '[role=option]');
		expect(matchesContextRole(['listbox'], el, specs, version)).toBe(true);
	});
});
