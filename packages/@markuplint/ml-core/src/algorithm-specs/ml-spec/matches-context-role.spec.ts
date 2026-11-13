import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

import { matchesContextRole } from '@markuplint/ml-spec';

function _(html: string, selector?: string) {
	return elementOf(html, selector);
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

	test('presentation parent IS transparent in 1.2', () => {
		const el = _('<ul><div role="presentation"><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
	});

	test('none parent IS transparent in 1.2', () => {
		const el = _('<ul><div role="none"><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
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

	test('presentation parent is transparent in 1.3', () => {
		const el = _('<ul><div role="presentation"><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
	});

	test('none parent is transparent in 1.3', () => {
		const el = _('<ul><div role="none"><li></li></div></ul>', 'li');
		expect(matchesContextRole(['list'], el, specs, version)).toBe(true);
	});
});

describe('slot', () => {
	test('a slot between the element and its parent is passed through', () => {
		const el = _('<div role="list"><slot><div role="listitem"></div></slot></div>', '[role="listitem"]');
		expect(matchesContextRole(['list'], el, specs, '1.3')).toBe(true);
	});

	test('a slot is passed through in the middle of a chain', () => {
		const nested = _('<div role="list"><div role="group"><slot><li></li></slot></div></div>', 'li');
		expect(matchesContextRole(['list > group'], nested, specs, '1.3')).toBe(true);
	});

	test('a slot does not satisfy a required parent role', () => {
		const el = _('<div><slot><div role="listitem"></div></slot></div>', '[role="listitem"]');
		expect(matchesContextRole(['list'], el, specs, '1.3')).toBe(false);
	});
});
