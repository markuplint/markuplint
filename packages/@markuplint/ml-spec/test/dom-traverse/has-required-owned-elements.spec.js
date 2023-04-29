const specs = require('@markuplint/html-spec');
const { createSelector } = require('@markuplint/selector');
const { createJSDOMElement } = require('@markuplint/test-tools');

const { hasRequiredOwnedElement } = require('../../lib/dom-traverse/has-required-owned-elements');

function _(html, selector) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

function m(html, version, selector) {
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
