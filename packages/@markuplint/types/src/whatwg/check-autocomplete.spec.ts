import { test, expect } from 'vitest';

import { checkAutoComplete } from './check-autocomplete.js';

const check = checkAutoComplete();

test('basic', () => {
	expect(check('on').matched).toBe(true);
	expect(check('on webauthn').matched).toBe(false);
	expect(check('off').matched).toBe(true);
	expect(check('off webauthn').matched).toBe(false);
	expect(check('name').matched).toBe(true);
	expect(check('given-name').matched).toBe(true);
	expect(check('given-name webauthn').matched).toBe(true);
	expect(check('given-name webauthun').matched).toBe(false);
	expect(check('section-').matched).toBe(false);
	expect(check('section-foo').matched).toBe(false);
	expect(check('section-foo webauthn').matched).toBe(false);
	expect(check('section-foo name').matched).toBe(true);
	expect(check('section-foo name webauthn').matched).toBe(true);
	expect(check('section-foo shipping name').matched).toBe(true);
	expect(check('section-foo billing name').matched).toBe(true);
	expect(check('section-foo billing home').matched).toBe(false);
	expect(check('section-foo billing work').matched).toBe(false);
	expect(check('section-foo billing home tel').matched).toBe(true);
	expect(check('section-foo billing work email').matched).toBe(true);
	expect(check('section-foo billing work email webauthn').matched).toBe(true);
	expect(check('shipping name').matched).toBe(true);
	expect(check('billing name').matched).toBe(true);
	expect(check('billing home').matched).toBe(false);
	expect(check('billing work').matched).toBe(false);
	expect(check('billing home tel').matched).toBe(true);
	expect(check('billing work email').matched).toBe(true);
	expect(check('billing work email webauthn').matched).toBe(true);
	expect(check('home tel').matched).toBe(true);
	expect(check('work email').matched).toBe(true);
	expect(check('work email webauthn').matched).toBe(true);
});

test('prefix-only invalid', () => {
	// All prefix tokens without field name must be invalid
	expect(check('section-').matched).toBe(false);
	expect(check('section-foo').matched).toBe(false);
	expect(check('shipping').matched).toBe(false);
	expect(check('billing').matched).toBe(false);
	expect(check('home').matched).toBe(false);
	expect(check('work').matched).toBe(false);
	expect(check('mobile').matched).toBe(false);
	expect(check('fax').matched).toBe(false);
	expect(check('pager').matched).toBe(false);
});

test('webauthn category re-determination', () => {
	// Spec: "the webauthn token must appear along with at least one other token;
	// an autocomplete attribute whose value consists solely of the webauthn token
	// is non-conforming."
	expect(check('webauthn').matched).toBe(false);

	// Field name + webauthn
	expect(check('name webauthn').matched).toBe(true);
	expect(check('tel webauthn').matched).toBe(true);

	// With section
	expect(check('section-foo name webauthn').matched).toBe(true);

	// With shipping/billing
	expect(check('shipping name webauthn').matched).toBe(true);

	// With contacting token
	expect(check('home tel webauthn').matched).toBe(true);

	// Full 5-token chain (section + shipping + home + tel + webauthn)
	expect(check('section-foo shipping home tel webauthn').matched).toBe(true);

	// Prefix-only + webauthn is invalid (no field name)
	expect(check('section-foo webauthn').matched).toBe(false);
	expect(check('shipping webauthn').matched).toBe(false);
	expect(check('home webauthn').matched).toBe(false);
});

test('max token count', () => {
	// Normal: max 3 tokens (section + shipping/billing + field)
	expect(check('section-foo shipping name').matched).toBe(true);
	// Contact: max 4 tokens (section + shipping/billing + contacting + contactable)
	expect(check('section-foo shipping home tel').matched).toBe(true);
	// Credential: max 5 tokens (section + shipping/billing + contacting + contactable + webauthn)
	expect(check('section-foo shipping home tel webauthn').matched).toBe(true);
});

test('contacting token with Normal field is invalid', () => {
	expect(check('home name').matched).toBe(false);
	expect(check('work street-address').matched).toBe(false);
});

test('unexpected-token (comma)', () => {
	// Backward parse: "name" consumed as field, "," at index 1 not matched,
	// "section-foo" at index 0 not matched → "," is extra at step 7
	// Neither shipping/billing nor section-* consumed → expects include both
	expect(check('section-foo , name')).toStrictEqual({
		matched: false,
		raw: ',',
		offset: 12,
		length: 1,
		line: 1,
		column: 13,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'shipping' },
			{ type: 'const', value: 'billing' },
			{ type: 'common', value: 'autofill field name' },
		],
		candidate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('unexpected-token (unknown single token)', () => {
	expect(check('xxx')).toStrictEqual({
		matched: false,
		raw: 'xxx',
		offset: 0,
		length: 3,
		line: 1,
		column: 1,
		reason: 'unexpected-token',
		expects: [
			{ type: 'common', value: 'autofill named group' },
			{ type: 'common', value: 'autofill field name' },
		],
		candidate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('unexpected-token (typo in field name)', () => {
	// "neme" as last token: backward parse checks it as field name directly
	expect(check('section-foo neme')).toStrictEqual({
		matched: false,
		raw: 'neme',
		offset: 12,
		length: 4,
		line: 1,
		column: 13,
		reason: 'unexpected-token',
		expects: [{ type: 'common', value: 'autofill field name' }],
		candidate: 'name',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo shipping neme')).toStrictEqual({
		matched: false,
		raw: 'neme',
		offset: 21,
		length: 4,
		line: 1,
		column: 22,
		reason: 'unexpected-token',
		expects: [{ type: 'common', value: 'autofill field name' }],
		candidate: 'name',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	// "home name" — name is Normal, home is not valid as prefix for Normal field
	expect(check('section-foo shipping home name')).toStrictEqual({
		matched: false,
		raw: 'home',
		offset: 21,
		length: 4,
		line: 1,
		column: 22,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'shipping' },
			{ type: 'const', value: 'billing' },
			{ type: 'common', value: 'autofill named group' },
		],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping',
	});
	// "emall" as last token: backward parse checks it as field name
	expect(check('section-foo shipping home emall')).toStrictEqual({
		matched: false,
		raw: 'emall',
		offset: 26,
		length: 5,
		line: 1,
		column: 27,
		reason: 'unexpected-token',
		expects: [{ type: 'common', value: 'autofill field name' }],
		candidate: 'email',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('duplicated', () => {
	expect(check('name name')).toStrictEqual({
		matched: false,
		raw: 'name',
		offset: 5,
		length: 4,
		line: 1,
		column: 6,
		partName: 'the content of the list',
		reason: 'duplicated',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete',
	});
	expect(check('on on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 3,
		length: 2,
		line: 1,
		column: 4,
		partName: 'the content of the list',
		reason: 'duplicated',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete',
	});
});

test('extra-token', () => {
	expect(check('on off')).toStrictEqual({
		matched: false,
		raw: 'off',
		offset: 3,
		length: 3,
		line: 1,
		column: 4,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2',
	});
	expect(check('off on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 4,
		length: 2,
		line: 1,
		column: 5,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2',
	});
	expect(check('on name')).toStrictEqual({
		matched: false,
		raw: 'name',
		offset: 3,
		length: 4,
		line: 1,
		column: 4,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2',
	});
	expect(check('name on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 5,
		length: 2,
		line: 1,
		column: 6,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo name on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 17,
		length: 2,
		line: 1,
		column: 18,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo billing name on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 25,
		length: 2,
		line: 1,
		column: 26,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('billing name on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 13,
		length: 2,
		line: 1,
		column: 14,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 4,
		length: 2,
		line: 1,
		column: 5,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('home tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 9,
		length: 2,
		line: 1,
		column: 10,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('billing home tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 17,
		length: 2,
		line: 1,
		column: 18,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo billing home tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 29,
		length: 2,
		line: 1,
		column: 30,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo home tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 21,
		length: 2,
		line: 1,
		column: 22,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo tel on')).toStrictEqual({
		matched: false,
		raw: 'on',
		offset: 16,
		length: 2,
		line: 1,
		column: 17,
		reason: 'extra-token',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('duplicated section', () => {
	// Backward parsing: section-bar is last token, not a valid field name
	expect(check('section-foo section-bar')).toStrictEqual({
		matched: false,
		raw: 'section-bar',
		offset: 12,
		length: 11,
		line: 1,
		column: 13,
		reason: 'unexpected-token',
		expects: [{ type: 'common', value: 'autofill field name' }],
		candidate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('duplicated part', () => {
	// Backward parsing: billing is last token, not a valid field name
	expect(check('shipping billing')).toStrictEqual({
		matched: false,
		raw: 'billing',
		offset: 9,
		length: 7,
		line: 1,
		column: 10,
		reason: 'unexpected-token',
		expects: [{ type: 'common', value: 'autofill field name' }],
		candidate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('typo', () => {
	// Backward parsing: "name" is valid field name (Normal), "secsion-foo" at index 0 is extra.
	// Neither shipping/billing nor section-* consumed → expects include shipping/billing/field.
	// getCandidate detects "secsion-foo" → "section-foo" typo.
	expect(check('secsion-foo name')).toStrictEqual({
		matched: false,
		raw: 'secsion-foo',
		offset: 0,
		length: 11,
		line: 1,
		column: 1,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'shipping' },
			{ type: 'const', value: 'billing' },
			{ type: 'common', value: 'autofill field name' },
		],
		candidate: 'section-foo',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('case insensitivity', () => {
	// Field names are case-insensitive per spec
	expect(check('NAME').matched).toBe(true);
	expect(check('Name').matched).toBe(true);
	expect(check('GIVEN-NAME').matched).toBe(true);
	expect(check('TEL').matched).toBe(true);
	expect(check('EMAIL').matched).toBe(true);
	// `WEBAUTHN` as the only token is non-conforming regardless of case
	// (see "webauthn category re-determination" test above for the spec citation).
	expect(check('NAME WEBAUTHN').matched).toBe(true);

	// Prefix tokens are case-insensitive
	expect(check('SHIPPING name').matched).toBe(true);
	expect(check('BILLING name').matched).toBe(true);
	expect(check('Section-Foo name').matched).toBe(true);
	expect(check('SECTION-FOO SHIPPING NAME').matched).toBe(true);

	// Contacting tokens are case-insensitive
	expect(check('HOME tel').matched).toBe(true);
	expect(check('WORK email').matched).toBe(true);

	// on/off are case-insensitive
	expect(check('ON').matched).toBe(true);
	expect(check('OFF').matched).toBe(true);
});
