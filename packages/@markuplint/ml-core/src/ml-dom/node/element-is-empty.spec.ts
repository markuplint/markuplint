import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */
describe('MLElement#isEmpty', () => {
	function isEmpty(code: string) {
		return createTestDocument(code).querySelector('div')?.isEmpty();
	}

	test.each(['<div></div>', '<div> </div>', '<div>\t\n\f\r </div>'])('is true for %j', code => {
		expect(isEmpty(code)).toBe(true);
	});

	test.each(['<div>a</div>', '<div><b></b></div>', '<div><!-- a --></div>'])('is false for %j', code => {
		expect(isEmpty(code)).toBe(false);
	});

	test.each(['\u00A0', '\uFEFF', '\u2028', '\u2003', '\u3000', '\v', ' \u00A0 '])(
		'is false for the non-ASCII white space %j',
		value => {
			expect(isEmpty(`<div>${value}</div>`)).toBe(false);
		},
	);

	test.each(['&nbsp;', '&#xA0;', '&#32;'])('is false for the character reference %j, which is not decoded', value => {
		expect(isEmpty(`<div>${value}</div>`)).toBe(false);
	});
});
