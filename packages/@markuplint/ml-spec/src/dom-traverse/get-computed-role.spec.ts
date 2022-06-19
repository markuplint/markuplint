import type { ARIAVersion } from '../types';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';

import { getComputedRole } from './get-computed-role';

function c(html: string, version: ARIAVersion) {
	const el = createJSDOMElement(html);

	// JSDOM supports no level 4 selectors yet.
	el.matches = (selector: string) => {
		return !!createSelector(selector, specs).match(el);
	};

	return getComputedRole(specs, el, version);
}

describe('getComputedRole', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toBe(null);
		expect(c('<a href></a>', '1.2')?.name).toBe('link');
		expect(c('<a role="button"></a>', '1.2')?.name).toBe('button');
		expect(c('<a role="button" href></a>', '1.2')?.name).toBe('button');
	});
});
