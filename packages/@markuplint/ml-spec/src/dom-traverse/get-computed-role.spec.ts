import type { ARIAVersion } from '../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getComputedRole } from './get-computed-role.js';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

function c(html: string, version: ARIAVersion, selector?: string) {
	return getComputedRole(specs, _(html, selector), version);
}

function tree(html: string, version: ARIAVersion) {
	const el = _(html);
	const tree = [];
	let current: Element | null = el;

	while (current != null) {
		const role = getComputedRole(specs, current, version);
		const result = [current.localName, role.role?.name ?? null];
		if (role.errorType) {
			result.push(role.errorType);
		}
		tree.push(result);
		current = current.children.item(0);
	}
	return tree;
}

describe('1.2', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2').role?.name).toBe('generic');
		expect(c('<a href></a>', '1.2').role?.name).toBe('link');
		expect(c('<a role="button"></a>', '1.2').role?.name).toBe('button');
		expect(c('<a role="button" href></a>', '1.2').role?.name).toBe('button');
		expect(c('<a role="foo" href></a>', '1.2').role?.name).toBe('link');
	});

	test('the heading role', () => {
		expect(c('<h1></h1>', '1.2').role?.name).toBe('heading');
		expect(c('<h1></h1>', '1.2').role?.isImplicit).toBe(true);
		expect(c('<div role="heading"></div>', '1.2').role?.name).toBe('heading');
		expect(c('<div role="heading"></div>', '1.2').role?.isImplicit).toBe(false);
	});

	test('multiple', () => {
		expect(c('<div role="presentation heading"></div>', '1.2').role?.name).toBe('presentation');
		expect(c('<div role="roletype heading"></div>', '1.2').role?.name).toBe('heading');
		expect(c('<img alt="alt" role="banner button"/>', '1.2').role?.name).toBe('button');
		expect(c('<img alt="alt" role="foo button"/>', '1.2').role?.name).toBe('button');
		expect(c('<img alt="alt" role="graphics-symbol button"/>', '1.2').role?.name).toBe('button');
	});

	test('svg', () => {
		expect(c('<svg><rect role="graphics-symbol img"></rect></svg>', '1.2', 'rect').role?.name).toBe(
			'graphics-symbol',
		);
		expect(c('<svg><rect role="roletype img" aria-label="accname"></rect></svg>', '1.2', 'rect').role?.name).toBe(
			'img',
		);
		expect(c('<svg><rect role="roletype" aria-label="accname"></rect></svg>', '1.2', 'rect').role?.name).toBe(
			'graphics-symbol',
		);
	});

	test('landmark', () => {
		expect(c('<div role="region"></div>', '1.2').role?.name).toBe('generic');
		expect(c('<div role="region" aria-label="foo"></div>', '1.2').role?.name).toBe('region');
		expect(c('<div role="form"></div>', '1.2').role?.name).toBe('generic');
		expect(c('<div role="form" aria-label="foo"></div>', '1.2').role?.name).toBe('form');
		expect(c('<div role="navigation"></div>', '1.2').role?.name).toBe('navigation');
		expect(c('<div role="navigation" aria-label="foo"></div>', '1.2').role?.name).toBe('navigation');
	});

	test('Presentational Roles Conflict Resolution (1) Interactive Elements', () => {
		expect(c('<a href="path/to"></a>', '1.2').role?.name).toBe('link');
		expect(c('<a role="none" href="path/to"></a>', '1.2').role?.name).toBe('link'); // No permitted role
		expect(c('<a></a>', '1.2').role?.name).toBe('generic');
		expect(c('<a role="none"></a>', '1.2').role?.name).toBe('none');
		expect(c('<a role="none" href="path/to" disabled></a>', '1.2').role?.name).toBe('link'); // No permitted role
		expect(c('<button></button>', '1.2').role?.name).toBe('button');
		expect(c('<button disabled></button>', '1.2').role?.name).toBe('button');
		expect(c('<button role="none"></button>', '1.2').role?.name).toBe('button'); // No permitted role
		expect(c('<button role="none" disabled></button>', '1.2').role?.name).toBe('button'); // No permitted role
		expect(c('<div></div>', '1.2').role?.name).toBe('generic');
		expect(c('<div role="none"></div>', '1.2').role?.name).toBe('none');
		expect(c('<div tabindex="0"></div>', '1.2').role?.name).toBe('generic');
		expect(c('<div tabindex="0" role="none"></div>', '1.2').role?.name).toBe('generic');
		expect(c('<div><span></span></div>', '1.2', 'span').role?.name).toBe('generic');
		expect(c('<div><span role="none"></span></div>', '1.2', 'span').role?.name).toBe('none');
		expect(c('<div><span tabindex="0"></span></div>', '1.2', 'span').role?.name).toBe('generic');
		expect(c('<div><span tabindex="0" role="none"></span></div>', '1.2', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span></span></div>', '1.2', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span role="none"></span></div>', '1.2', 'span').role?.name).toBe('none');
		expect(c('<div hidden><span tabindex="0"></span></div>', '1.2', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span tabindex="0" role="none"></span></div>', '1.2', 'span').role?.name).toBe('none');
	});

	test('Presentational Roles Conflict Resolution (2-1) Required Owned Elements', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.2', 'td').role?.name).toBe('cell');
		expect(c('<table><tr><td role="none">foo</td></tr></table>', '1.2', 'td').role?.name).toBe('cell');
		expect(c('<table><tbody role="none"><tr><td>foo</td></tr></tbody></table>', '1.2', 'tbody').role?.name).toBe(
			'rowgroup',
		);
		expect(c('<ul><li></li></ul>', '1.2', 'li').role?.name).toBe('listitem');
		expect(c('<ul><li role="presentation"></li></ul>', '1.2', 'li').role?.name).toBe('listitem');
	});

	test('Presentational Roles Conflict Resolution (2-2) the accessibility tree to be malformed', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.2', 'td').role?.name).toBe('cell');
		expect(c('<table role="none"><tr><td>foo</td></tr></table>', '1.2', 'td').role?.name).toBe(undefined);
		expect(tree('<table><tr><td>foo</td></tr></table>', '1.2')).toStrictEqual([
			['table', 'table'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'cell'],
		]);
		expect(tree('<table role="none"><tr><td>foo</td></tr></table>', '1.2')).toStrictEqual([
			['table', 'none'],
			['tbody', null, 'NO_OWNER'],
			['tr', null, 'NO_OWNER'],
			['td', null /* NOT MATCHING THE CONDITIONS */],
		]);
		expect(
			tree(
				'<table role="table"><tbody role="rowgroup"><tr role="row"><td role="gridcell"></td></tr></tbody></table>',
				'1.2',
			),
		).toStrictEqual([
			['table', 'table'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'cell', 'NO_PERMITTED'],
		]);
		expect(
			tree(
				'<table role="grid"><tbody role="rowgroup"><tr role="row"><td role="gridcell"></td></tr></tbody></table>',
				'1.2',
			),
		).toStrictEqual([
			['table', 'grid'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'gridcell'],
		]);
	});

	test('Presentational Roles Conflict Resolution (3) Global Props', () => {
		/**
		 * @see https://w3c.github.io/aria/#example-41
		 */
		expect(c('<h1 role="presentation" aria-describedby="comment-1"> Sample Content </h1>', '1.2').role?.name).toBe(
			'heading',
		);
		expect(c('<h1 role="presentation" aria-level="2"> Sample Content </h1>', '1.2').role?.name).toBe(
			'presentation',
		);
	});
});

describe('1.3', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.3').role?.name).toBe('generic');
		expect(c('<a href></a>', '1.3').role?.name).toBe('link');
		expect(c('<a role="button"></a>', '1.3').role?.name).toBe('button');
		expect(c('<a role="button" href></a>', '1.3').role?.name).toBe('button');
		expect(c('<a role="foo" href></a>', '1.3').role?.name).toBe('link');
	});

	test('the heading role', () => {
		expect(c('<h1></h1>', '1.3').role?.name).toBe('heading');
		expect(c('<h1></h1>', '1.3').role?.isImplicit).toBe(true);
		expect(c('<div role="heading"></div>', '1.3').role?.name).toBe('heading');
		expect(c('<div role="heading"></div>', '1.3').role?.isImplicit).toBe(false);
	});

	test('multiple', () => {
		expect(c('<div role="presentation heading"></div>', '1.3').role?.name).toBe('presentation');
		expect(c('<div role="roletype heading"></div>', '1.3').role?.name).toBe('heading');
		expect(c('<img alt="alt" role="banner button"/>', '1.3').role?.name).toBe('button');
		expect(c('<img alt="alt" role="foo button"/>', '1.3').role?.name).toBe('button');
		expect(c('<img alt="alt" role="graphics-symbol button"/>', '1.3').role?.name).toBe('button');
	});

	test('svg', () => {
		expect(c('<svg><rect role="graphics-symbol img"></rect></svg>', '1.3', 'rect').role?.name).toBe(
			'graphics-symbol',
		);
		expect(c('<svg><rect role="roletype img" aria-label="accname"></rect></svg>', '1.3', 'rect').role?.name).toBe(
			'img',
		);
		expect(c('<svg><rect role="roletype" aria-label="accname"></rect></svg>', '1.3', 'rect').role?.name).toBe(
			'graphics-symbol',
		);
	});

	test('landmark', () => {
		expect(c('<div role="region"></div>', '1.3').role?.name).toBe('generic');
		expect(c('<div role="region" aria-label="foo"></div>', '1.3').role?.name).toBe('region');
		expect(c('<div role="form"></div>', '1.3').role?.name).toBe('generic');
		expect(c('<div role="form" aria-label="foo"></div>', '1.3').role?.name).toBe('form');
		expect(c('<div role="navigation"></div>', '1.3').role?.name).toBe('navigation');
		expect(c('<div role="navigation" aria-label="foo"></div>', '1.3').role?.name).toBe('navigation');
	});

	test('Presentational Roles Conflict Resolution (1) Interactive Elements', () => {
		expect(c('<a href="path/to"></a>', '1.3').role?.name).toBe('link');
		expect(c('<a role="none" href="path/to"></a>', '1.3').role?.name).toBe('link'); // No permitted role
		expect(c('<a></a>', '1.3').role?.name).toBe('generic');
		expect(c('<a role="none"></a>', '1.3').role?.name).toBe('none');
		expect(c('<a role="none" href="path/to" disabled></a>', '1.3').role?.name).toBe('link'); // No permitted role
		expect(c('<button></button>', '1.3').role?.name).toBe('button');
		expect(c('<button disabled></button>', '1.3').role?.name).toBe('button');
		expect(c('<button role="none"></button>', '1.3').role?.name).toBe('button'); // No permitted role
		expect(c('<button role="none" disabled></button>', '1.3').role?.name).toBe('button'); // No permitted role
		expect(c('<div></div>', '1.3').role?.name).toBe('generic');
		expect(c('<div role="none"></div>', '1.3').role?.name).toBe('none');
		expect(c('<div tabindex="0"></div>', '1.3').role?.name).toBe('generic');
		expect(c('<div tabindex="0" role="none"></div>', '1.3').role?.name).toBe('generic');
		expect(c('<div><span></span></div>', '1.3', 'span').role?.name).toBe('generic');
		expect(c('<div><span role="none"></span></div>', '1.3', 'span').role?.name).toBe('none');
		expect(c('<div><span tabindex="0"></span></div>', '1.3', 'span').role?.name).toBe('generic');
		expect(c('<div><span tabindex="0" role="none"></span></div>', '1.3', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span></span></div>', '1.3', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span role="none"></span></div>', '1.3', 'span').role?.name).toBe('none');
		expect(c('<div hidden><span tabindex="0"></span></div>', '1.3', 'span').role?.name).toBe('generic');
		expect(c('<div hidden><span tabindex="0" role="none"></span></div>', '1.3', 'span').role?.name).toBe('none');
	});

	test('Presentational Roles Conflict Resolution (2-1) Required Owned Elements', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.3', 'td').role?.name).toBe('cell');
		expect(c('<table><tr><td role="none">foo</td></tr></table>', '1.3', 'td').role?.name).toBe('cell');
		expect(c('<table><tbody role="none"><tr><td>foo</td></tr></tbody></table>', '1.3', 'tbody').role?.name).toBe(
			'rowgroup',
		);
		expect(c('<ul><li></li></ul>', '1.3', 'li').role?.name).toBe('listitem');
		expect(c('<ul><li role="presentation"></li></ul>', '1.3', 'li').role?.name).toBe('listitem');
	});

	test('Presentational Roles Conflict Resolution (2-2) the accessibility tree to be malformed', () => {
		expect(c('<table><tr><td>foo</td></tr></table>', '1.3', 'td').role?.name).toBe('cell');
		expect(c('<table role="none"><tr><td>foo</td></tr></table>', '1.3', 'td').role?.name).toBe(undefined);
		expect(tree('<table><tr><td>foo</td></tr></table>', '1.3')).toStrictEqual([
			['table', 'table'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'cell'],
		]);
		// TODO: https://github.com/markuplint/markuplint/issues/1265
		expect(tree('<table role="none"><tr><td>foo</td></tr></table>', '1.3')).toStrictEqual([
			['table', 'none'],
			['tbody', null, 'NO_OWNER'],
			['tr', 'row'],
			['td', null /* NOT MATCHING THE CONDITIONS */],
		]);
		expect(
			tree(
				'<table role="table"><tbody role="rowgroup"><tr role="row"><td role="gridcell"></td></tr></tbody></table>',
				'1.3',
			),
		).toStrictEqual([
			['table', 'table'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'cell', 'NO_PERMITTED'],
		]);
		expect(
			tree(
				'<table role="grid"><tbody role="rowgroup"><tr role="row"><td role="gridcell"></td></tr></tbody></table>',
				'1.3',
			),
		).toStrictEqual([
			['table', 'grid'],
			['tbody', 'rowgroup'],
			['tr', 'row'],
			['td', 'gridcell'],
		]);
	});

	test('Presentational Roles Conflict Resolution (3) Global Props', () => {
		/**
		 * @see https://w3c.github.io/aria/#example-41
		 */
		expect(c('<h1 role="presentation" aria-describedby="comment-1"> Sample Content </h1>', '1.3').role?.name).toBe(
			'heading',
		);
		expect(c('<h1 role="presentation" aria-level="2"> Sample Content </h1>', '1.3').role?.name).toBe(
			'presentation',
		);
	});
});

describe('Issues', () => {
	test('#778', () => {
		expect(c('<td role="gridcell"></td>', '1.2').role?.name).toBe('gridcell');
		expect(c('<td role="gridcell"></td>', '1.3').role?.name).toBe('gridcell');
	});

	test('#1026', () => {
		expect(c('<svg><rect width="30" height="30" /></svg>', '1.2', 'rect').role?.name).toBe(undefined);
		expect(
			c('<svg><rect width="30" height="30"><title>Accname</title></rect></svg>', '1.2', 'rect').role?.name,
		).toBe('graphics-symbol');
		expect(c('<svg><rect aria-label="accname" width="30" height="30" /></svg>', '1.2', 'rect').role?.name).toBe(
			'graphics-symbol',
		);
		expect(
			c('<svg role="img"><rect aria-label="accname" width="30" height="30" /></svg>', '1.2', 'rect').role?.name,
		).toBe('graphics-symbol');
	});
});
