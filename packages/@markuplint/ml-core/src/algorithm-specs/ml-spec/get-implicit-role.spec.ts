import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

import { getImplicitRole } from '@markuplint/ml-spec';

function _(html: string, selector?: string) {
	return elementOf(html, selector);
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
