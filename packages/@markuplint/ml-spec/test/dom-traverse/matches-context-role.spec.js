const specs = require('@markuplint/html-spec');
const { createSelector } = require('@markuplint/selector');
const { createJSDOMElement } = require('@markuplint/test-tools');

const { matchesContextRole } = require('../../lib/dom-traverse/matches-context-role');

function _(html, selector) {
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
});
