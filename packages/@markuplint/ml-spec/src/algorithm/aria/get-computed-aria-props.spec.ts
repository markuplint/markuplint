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
