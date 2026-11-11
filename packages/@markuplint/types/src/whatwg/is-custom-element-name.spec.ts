import { test, expect, describe } from 'vitest';

import { check } from '../check.js';

describe('CustomElementName (valid element local name)', () => {
	test.each([
		'my-element',
		'a-b',
		'x-1',
		'math-α',
		'emotion-😍',
		'my-el.ement',
		'my-el_ement',
		'my-el:ement',
		'font-faces',
		'a-',
		'a--',
	])('valid: %s', name => {
		expect(check(name, 'CustomElementName').matched).toBe(true);
	});

	test.each([
		'',
		'element',
		'My-element',
		'my-Element',
		'a-B',
		'-my',
		'1-a',
		'_-a',
		'annotation-xml',
		'color-profile',
		'font-face',
		'font-face-src',
		'font-face-uri',
		'font-face-format',
		'font-face-name',
		'missing-glyph',
		'my-el/ement',
		'my-el>ement',
		'my-el ement',
		'my-el\tement',
		'my-el\nement',
		'my-el\fement',
		'my-el\rement',
		'my-el\u0000ement',
	])('invalid: %j', name => {
		expect(check(name, 'CustomElementName').matched).toBe(false);
	});

	test('characters that the former PCEN production rejected but "valid element local name" allows', () => {
		expect(check('my-el<ement', 'CustomElementName').matched).toBe(true);
		expect(check('my-el"ement', 'CustomElementName').matched).toBe(true);
		expect(check('my-el\u0001ement', 'CustomElementName').matched).toBe(true);
	});
});
