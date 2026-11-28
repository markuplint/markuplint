import type { ARIAVersion } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getComputedAriaProps } from './get-computed-aria-props.js';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

function c(html: string, version: ARIAVersion, selector?: string) {
	return getComputedAriaProps(specs, _(html, selector), version);
}

describe('1.2', () => {
	test('the link role', () => {
		expect(c('<a href></a>', '1.2')).toStrictEqual({
			'aria-atomic': {
				name: 'aria-atomic',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-busy': {
				name: 'aria-busy',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-controls': {
				name: 'aria-controls',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-current': {
				name: 'aria-current',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-describedby': {
				name: 'aria-describedby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-details': {
				name: 'aria-details',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-disabled': {
				name: 'aria-disabled',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-dropeffect': {
				name: 'aria-dropeffect',
				value: 'none',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-errormessage': {
				name: 'aria-errormessage',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-expanded': {
				name: 'aria-expanded',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-flowto': {
				name: 'aria-flowto',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-grabbed': {
				name: 'aria-grabbed',
				value: 'undefined',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-haspopup': {
				name: 'aria-haspopup',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-hidden': {
				name: 'aria-hidden',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-invalid': {
				name: 'aria-invalid',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-keyshortcuts': {
				name: 'aria-keyshortcuts',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-label': {
				name: 'aria-label',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-labelledby': {
				name: 'aria-labelledby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-live': {
				name: 'aria-live',
				value: 'off',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-owns': {
				name: 'aria-owns',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-relevant': {
				name: 'aria-relevant',
				value: 'additions text',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-roledescription': {
				name: 'aria-roledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
		});
	});

	test('the heading role', () => {
		expect(c('<h1></h1>', '1.2')).toStrictEqual({
			'aria-atomic': {
				name: 'aria-atomic',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-busy': {
				name: 'aria-busy',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-controls': {
				name: 'aria-controls',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-current': {
				name: 'aria-current',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-describedby': {
				name: 'aria-describedby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-details': {
				name: 'aria-details',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-disabled': {
				name: 'aria-disabled',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-dropeffect': {
				name: 'aria-dropeffect',
				value: 'none',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-errormessage': {
				name: 'aria-errormessage',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-flowto': {
				name: 'aria-flowto',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-grabbed': {
				name: 'aria-grabbed',
				value: 'undefined',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-haspopup': {
				name: 'aria-haspopup',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-hidden': {
				name: 'aria-hidden',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-invalid': {
				name: 'aria-invalid',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-keyshortcuts': {
				name: 'aria-keyshortcuts',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-label': {
				name: 'aria-label',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-labelledby': {
				name: 'aria-labelledby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-level': {
				name: 'aria-level',
				value: '1',
				deprecated: false,
				required: true,
				from: 'default',
			},
			'aria-live': {
				name: 'aria-live',
				value: 'off',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-owns': {
				name: 'aria-owns',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-relevant': {
				name: 'aria-relevant',
				value: 'additions text',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-roledescription': {
				name: 'aria-roledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
		});
	});

	test('from html-attr', () => {
		expect(c('<input type="checkbox" checked>', '1.2')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'true',
			deprecated: false,
			required: true,
			from: 'html-attr',
		});
	});

	test('overwrite aria-attr', () => {
		expect(c('<input type="checkbox" checked aria-checked="false">', '1.2')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'false',
			deprecated: false,
			required: true,
			from: 'aria-attr',
		});
	});

	test('overwrite aria-attr', () => {
		expect(c('<input type="checkbox" checked aria-checked="mixed">', '1.2')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'mixed',
			deprecated: false,
			required: true,
			from: 'aria-attr',
		});
	});
});

describe('1.3', () => {
	test('the link role', () => {
		expect(c('<a href></a>', '1.3')).toStrictEqual({
			'aria-atomic': {
				name: 'aria-atomic',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-braillelabel': {
				name: 'aria-braillelabel',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-brailleroledescription': {
				name: 'aria-brailleroledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-busy': {
				name: 'aria-busy',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-controls': {
				name: 'aria-controls',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-current': {
				name: 'aria-current',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-describedby': {
				name: 'aria-describedby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-description': {
				name: 'aria-description',
				deprecated: false,
				value: undefined,
				required: false,
				from: 'default',
			},
			'aria-details': {
				name: 'aria-details',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-disabled': {
				name: 'aria-disabled',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-dropeffect': {
				name: 'aria-dropeffect',
				value: 'none',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-errormessage': {
				name: 'aria-errormessage',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-expanded': {
				name: 'aria-expanded',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-flowto': {
				name: 'aria-flowto',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-grabbed': {
				name: 'aria-grabbed',
				value: 'undefined',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-haspopup': {
				name: 'aria-haspopup',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-hidden': {
				name: 'aria-hidden',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-invalid': {
				name: 'aria-invalid',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-keyshortcuts': {
				name: 'aria-keyshortcuts',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-label': {
				name: 'aria-label',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-labelledby': {
				name: 'aria-labelledby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-live': {
				name: 'aria-live',
				value: 'off',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-owns': {
				name: 'aria-owns',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-relevant': {
				name: 'aria-relevant',
				value: 'additions text',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-roledescription': {
				name: 'aria-roledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
		});
	});

	test('the heading role', () => {
		expect(c('<h1></h1>', '1.3')).toStrictEqual({
			'aria-atomic': {
				name: 'aria-atomic',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-braillelabel': {
				name: 'aria-braillelabel',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-brailleroledescription': {
				name: 'aria-brailleroledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-busy': {
				name: 'aria-busy',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-controls': {
				name: 'aria-controls',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-current': {
				name: 'aria-current',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-describedby': {
				name: 'aria-describedby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-description': {
				name: 'aria-description',
				deprecated: false,
				value: undefined,
				required: false,
				from: 'default',
			},
			'aria-details': {
				name: 'aria-details',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-disabled': {
				name: 'aria-disabled',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-dropeffect': {
				name: 'aria-dropeffect',
				value: 'none',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-errormessage': {
				name: 'aria-errormessage',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-flowto': {
				name: 'aria-flowto',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-grabbed': {
				name: 'aria-grabbed',
				value: 'undefined',
				deprecated: true,
				required: false,
				from: 'default',
			},
			'aria-haspopup': {
				name: 'aria-haspopup',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-hidden': {
				name: 'aria-hidden',
				value: 'undefined',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-invalid': {
				name: 'aria-invalid',
				value: 'false',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-keyshortcuts': {
				name: 'aria-keyshortcuts',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-label': {
				name: 'aria-label',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-labelledby': {
				name: 'aria-labelledby',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-level': {
				name: 'aria-level',
				value: '1',
				deprecated: false,
				required: true,
				from: 'default',
			},
			'aria-live': {
				name: 'aria-live',
				value: 'off',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-owns': {
				name: 'aria-owns',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-relevant': {
				name: 'aria-relevant',
				value: 'additions text',
				deprecated: false,
				required: false,
				from: 'default',
			},
			'aria-roledescription': {
				name: 'aria-roledescription',
				value: undefined,
				deprecated: false,
				required: false,
				from: 'default',
			},
		});
	});

	test('from html-attr', () => {
		expect(c('<input type="checkbox" checked>', '1.3')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'true',
			deprecated: false,
			required: true,
			from: 'html-attr',
		});
	});

	test('overwrite aria-attr', () => {
		expect(c('<input type="checkbox" checked aria-checked="false">', '1.3')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'false',
			deprecated: false,
			required: true,
			from: 'aria-attr',
		});
	});

	test('overwrite aria-attr', () => {
		expect(c('<input type="checkbox" checked aria-checked="mixed">', '1.3')['aria-checked']).toStrictEqual({
			name: 'aria-checked',
			value: 'mixed',
			deprecated: false,
			required: true,
			from: 'aria-attr',
		});
	});
});

/**
 * A value is trimmed of ASCII white space only: U+00A0 and the other non-ASCII white space are characters of it.
 *
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */
describe('the white space of a value', () => {
	test.each([
		['true', 'aria-attr'],
		[' true ', 'default'],
		['\ttrue\n', 'default'],
	])('reads %j for aria-checked from %s: a keyword is not trimmed', (value, from) => {
		const prop = c(`<div role="checkbox" aria-checked="${value}"></div>`, '1.2', 'div')['aria-checked'];
		expect(prop?.from).toBe(from);
	});

	test.each(['true\u00A0', '\u00A0true', 'true\uFEFF'])('takes %j as invalid for aria-checked', value => {
		const prop = c(`<div role="checkbox" aria-checked="${value}"></div>`, '1.2', 'div')['aria-checked'];
		expect(prop).toStrictEqual({
			name: 'aria-checked',
			value: 'undefined',
			deprecated: false,
			required: true,
			from: 'default',
		});
	});

	test.each([
		['token', '<div role="status" aria-live="polite\u00A0"></div>', 'aria-live'],
		['tristate', '<div role="button" aria-pressed="true\u00A0"></div>', 'aria-pressed'],
		['true/false', '<div role="button" aria-expanded="true\u00A0"></div>', 'aria-expanded'],
	])('does not take the %s value with U+00A0 as valid', (_type, html, name) => {
		expect(c(html, '1.2', 'div')[name]?.from).toBe('default');
	});

	test.each([
		['token', '<div role="status" aria-live=" polite\n"></div>', 'aria-live'],
		['tristate', '<div role="button" aria-pressed=" true "></div>', 'aria-pressed'],
		['true/false', '<div role="button" aria-expanded="\ttrue"></div>', 'aria-expanded'],
	])('does not take the %s value with ASCII white space as valid', (_type, html, name) => {
		expect(c(html, '1.2', 'div')[name]?.from).toBe('default');
	});

	test('takes the ID reference list of ASCII white space only as empty', () => {
		expect(c('<div role="button" aria-controls=" "></div>', '1.2', 'div')['aria-controls']?.from).toBe('default');
	});

	test('takes the ID reference list of U+00A0 as one token', () => {
		expect(c('<div role="button" aria-controls="\u00A0"></div>', '1.2', 'div')['aria-controls']?.from).toBe(
			'aria-attr',
		);
	});

	test.each(['5', ' 5 ', '5.5', '5.0', '.5', '-1', '1e2'])('takes %j as a number for aria-valuenow', value => {
		const prop = c(`<div role="slider" aria-valuenow="${value}"></div>`, '1.2', 'div')['aria-valuenow'];
		expect(prop?.from).toBe('aria-attr');
	});

	test.each(['\u00A05', '5\u00A0', '5abc', 'abc'])('does not take %j as a number for aria-valuenow', value => {
		const prop = c(`<div role="slider" aria-valuenow="${value}"></div>`, '1.2', 'div')['aria-valuenow'];
		expect(prop?.from).toBe('default');
	});

	test.each(['2', ' 2 '])('takes %j as an integer for aria-level', value => {
		const prop = c(`<div role="heading" aria-level="${value}"></div>`, '1.2', 'div')['aria-level'];
		expect(prop?.from).toBe('aria-attr');
	});

	test.each(['\u00A02', '2\u00A0', '2.5', '2abc'])('does not take %j as an integer for aria-level', value => {
		const prop = c(`<div role="heading" aria-level="${value}"></div>`, '1.2', 'div')['aria-level'];
		expect(prop?.from).toBe('default');
	});
});

describe('the default of a property that the role gives an implicit value', () => {
	test('is the implicit value of the role', () => {
		expect(c('<div role="separator"></div>', '1.3', 'div')['aria-orientation']).toStrictEqual({
			name: 'aria-orientation',
			value: 'horizontal',
			deprecated: false,
			required: false,
			from: 'default',
		});
	});
});

describe('the level of a heading element', () => {
	test('is its rank for its role heading', () => {
		expect(c('<h3>a</h3>', '1.3', 'h3')['aria-level']?.value).toBe('3');
	});

	test('is not its rank for another role', () => {
		expect(c('<ul role="tree"><h3 role="treeitem">a</h3></ul>', '1.3', 'h3')['aria-level']?.value).toBeUndefined();
	});
});

describe('aria-readonly of a text box', () => {
	test.each(['1.2', '1.3'] as const)(
		'is read from the readonly attribute, whichever of the entries of the data comes first (ARIA %s)',
		version => {
			const ariaOfVersion = specs.def['#aria'][version];
			const reordered = {
				...specs,
				def: {
					...specs.def,
					'#aria': {
						...specs.def['#aria'],
						[version]: {
							...ariaOfVersion,
							props: ariaOfVersion.props.map(prop =>
								prop.name === 'aria-readonly'
									? { ...prop, equivalentHtmlAttrs: prop.equivalentHtmlAttrs?.toReversed() }
									: prop,
							),
						},
					},
				},
			};
			expect(
				reordered.def['#aria'][version].props.find(prop => prop.name === 'aria-readonly')
					?.equivalentHtmlAttrs?.[0]?.condition,
			).toBe('editable');
			expect(
				getComputedAriaProps(reordered, _('<input type="text" readonly>'), version)['aria-readonly'],
			).toMatchObject({
				value: 'true',
				from: 'html-attr',
			});
		},
	);

	test.each([
		['<div role="textbox" contenteditable></div>', undefined],
		['<div role="textbox" contenteditable="false"></div>', undefined],
		['<div contenteditable><p role="textbox"></p></div>', 'p'],
	])('is the default, not read from contenteditable: %s', (html, selector) => {
		// The `contenteditable` row of ARIA in HTML stands for the editable state, which the attribute does not tell.
		// @see https://www.w3.org/TR/html-aria/#docconformance-attr
		for (const version of ['1.2', '1.3'] as const) {
			expect(c(html, version, selector)['aria-readonly'], version).toMatchObject({
				value: 'false',
				from: 'default',
			});
		}
	});
});
