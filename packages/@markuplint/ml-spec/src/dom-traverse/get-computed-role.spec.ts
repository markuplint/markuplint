import type { ARIAVersion } from '../types';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';

import { getComputedRole } from './get-computed-role';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return !!createSelector(selector, specs).match(this);
	});
}

function c(html: string, version: ARIAVersion, selector?: string) {
	return getComputedRole(specs, _(html, selector), version);
}

function tree(html: string, version: ARIAVersion) {
	const el = _(html);
	const tree: [string, string | null][] = [];
	let current: Element | null = el;
	while (current) {
		tree.push([current.localName, getComputedRole(specs, current, version)?.name || null]);
		current = current.children.item(0);
	}
	return tree;
}

describe('getComputedRole', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toBe(null);
		expect(c('<a href></a>', '1.2')?.name).toBe('link');
		expect(c('<a role="button"></a>', '1.2')?.name).toBe('button');
		expect(c('<a role="button" href></a>', '1.2')?.name).toBe('button');
		expect(c('<a role="foo" href></a>', '1.2')?.name).toBe('link');
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

	test('landmark', () => {
		expect(c('<div role="region"></div>', '1.2')?.name).toBe('generic');
		expect(c('<div role="region" aria-label="foo"></div>', '1.2')?.name).toBe('region');
		expect(c('<div role="form"></div>', '1.2')?.name).toBe('generic');
		expect(c('<div role="form" aria-label="foo"></div>', '1.2')?.name).toBe('form');
		expect(c('<div role="navigation"></div>', '1.2')?.name).toBe('navigation');
		expect(c('<div role="navigation" aria-label="foo"></div>', '1.2')?.name).toBe('navigation');
	});

	test('Presentational Roles Conflict Resolution (2-1) Required Owend Elements', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.2', 'td')?.name).toBe('cell');
		expect(c('<table><tr><td role="none">foo</td></tr></table>', '1.2', 'td')?.name).toBe('cell');
		expect(c('<table><tbody role="none"><tr><td>foo</td></tr></tbody></table>', '1.2', 'tbody')?.name).toBe(
			'rowgroup',
		);
		expect(c('<ul><li></li></ul>', '1.2', 'li')?.name).toBe('listitem');
		expect(c('<ul><li role="presentation"></li></ul>', '1.2', 'li')?.name).toBe('listitem');
	});

	test('Presentational Roles Conflict Resolution (2-2) the accessibility tree to be malformed', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.2', 'td')?.name).toBe('cell');
		expect(c('<table role="none"><tr><td>foo</td></tr></table>', '1.2', 'td')?.name).toBe(undefined);
		expect(tree('<table><tr><td>foo</td></tr></table>', '1.2')).toStrictEqual([
			['table', 'table'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'cell'],
		]);
		expect(tree('<table role="none"><tr><td>foo</td></tr></table>', '1.2')).toStrictEqual([
			['table', 'none'],
			['tbody', null],
			['tr', null],
			['td', null],
		]);
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
