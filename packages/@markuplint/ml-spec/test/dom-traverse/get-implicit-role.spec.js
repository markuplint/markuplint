const specs = require('@markuplint/html-spec');
const { createSelector } = require('@markuplint/selector');
const { createJSDOMElement } = require('@markuplint/test-tools');

const { getImplicitRole } = require('../../lib/dom-traverse/get-implicit-role');

function _(html, selector) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

describe('1.2', () => {
	test('<button>', () => {
		const el = _('<button></button>');
		const role = getImplicitRole(specs, el, '1.2');
		expect(role.role?.name).toBe('button');
	});

	test('<td>', () => {
		const el = _('<table><tr><td></td></tr></table>', 'td');
		const role = getImplicitRole(specs, el, '1.2');
		expect(role.role?.name).toBe('cell');
	});
});

describe('1.3', () => {
	test('<button>', () => {
		const el = _('<button></button>');
		const role = getImplicitRole(specs, el, '1.3');
		expect(role.role?.name).toBe('button');
	});

	test('<td>', () => {
		const el = _('<table><tr><td></td></tr></table>', 'td');
		const role = getImplicitRole(specs, el, '1.3');
		expect(role.role?.name).toBe('cell');
	});
});
