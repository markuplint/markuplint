import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getImplicitRole } from './get-implicit-role.js';

function _(html: string, selector?: string) {
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
