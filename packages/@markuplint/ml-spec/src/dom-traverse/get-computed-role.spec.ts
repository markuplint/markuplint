import type { ARIAVersion } from '../types';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';

import { getComputedRole } from './get-computed-role';

function c(html: string, version: ARIAVersion, selector?: string) {
	const el = createJSDOMElement(html, selector);

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

	test('the heading role', () => {
		expect(c('<h1></h1>', '1.2')?.name).toBe('heading');
		expect(c('<h1></h1>', '1.2')?.isImplicit).toBe(true);
		expect(c('<div role="heading"></div>', '1.2')?.name).toBe('heading');
		expect(c('<div role="heading"></div>', '1.2')?.isImplicit).toBe(false);
	});

	test('multiple', () => {
		expect(c('<div role="presentation heading"></div>', '1.2')?.name).toBe('presentation');
		expect(c('<div role="roletype heading"></div>', '1.2')?.name).toBe('heading');
		expect(c('<img alt="alt" role="banner button"/>', '1.2')?.name).toBe('button');
		expect(c('<img alt="alt" role="foo button"/>', '1.2')?.name).toBe('button');
		expect(c('<img alt="alt" role="graphics-symbol button"/>', '1.2')?.name).toBe('button');
	});

	test('svg', () => {
		expect(c('<svg><rect role="graphics-symbol img"></rect></svg>', '1.2', 'rect')?.name).toBe('graphics-symbol');
		expect(c('<svg><rect role="roletype img"></rect></svg>', '1.2', 'rect')?.name).toBe('img');
		expect(c('<svg><rect role="roletype"></rect></svg>', '1.2', 'rect')?.name).toBe('graphics-symbol');
	});

	test('Presentational Roles Conflict Resolution (3) Global Props', () => {
		/**
		 * @see https://w3c.github.io/aria/#example-41
		 */
		expect(c('<h1 role="presentation" aria-describedby="comment-1"> Sample Content </h1>', '1.2')?.name).toBe(
			'heading',
		);
		expect(c('<h1 role="presentation" aria-level="2"> Sample Content </h1>', '1.2')?.name).toBe('presentation');
	});
});
