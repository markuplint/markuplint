import { describe, test, expect } from 'vitest';

import { isAriaTrue } from './is-aria-true.js';

describe('isAriaTrue', () => {
	test.each(['true', 'TRUE', 'True'])('takes %j for true', value => {
		expect(isAriaTrue(value)).toBe(true);
	});

	test.each([' true ', '\ftrue', 'true\u00A0', '\u00A0true', 'false', 'undefined', '', 'tru e', null, undefined])(
		'does not take %j for true',
		value => {
			expect(isAriaTrue(value)).toBe(false);
		},
	);
});
