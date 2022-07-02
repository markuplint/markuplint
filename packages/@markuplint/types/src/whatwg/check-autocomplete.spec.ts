import { checkAutoComplete } from './check-autocomplete';

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
	expect(check('section-').matched).toBe(true);
	expect(check('section-foo').matched).toBe(true);
	expect(check('section-foo webauthn').matched).toBe(true);
	expect(check('section-foo name').matched).toBe(true);
	expect(check('section-foo name webauthn').matched).toBe(true);
	expect(check('section-foo shipping name').matched).toBe(true);
	expect(check('section-foo billing name').matched).toBe(true);
	expect(check('section-foo billing home').matched).toBe(true);
	expect(check('section-foo billing work').matched).toBe(true);
	expect(check('section-foo billing home tel').matched).toBe(true);
	expect(check('section-foo billing work email').matched).toBe(true);
	expect(check('section-foo billing work email webauthn').matched).toBe(true);
	expect(check('shipping name').matched).toBe(true);
	expect(check('billing name').matched).toBe(true);
	expect(check('billing home').matched).toBe(true);
	expect(check('billing work').matched).toBe(true);
	expect(check('billing home tel').matched).toBe(true);
	expect(check('billing work email').matched).toBe(true);
	expect(check('billing work email webauthn').matched).toBe(true);
	expect(check('home tel').matched).toBe(true);
	expect(check('work email').matched).toBe(true);
	expect(check('work email webauthn').matched).toBe(true);
});

test('unexpected-token', () => {
	expect(check('section-foo , name')).toStrictEqual({
		matched: false,
		raw: ',',
		offset: 12,
		length: 1,
		line: 1,
		column: 13,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'billing' },
			{ type: 'const', value: 'shipping' },
			{ type: 'common', value: 'autofill field name' },
		],
		candicate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('unexpected-token', () => {
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
		candicate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});

test('unexpected-token', () => {
	expect(check('section-foo neme')).toStrictEqual({
		matched: false,
		raw: 'neme',
		offset: 12,
		length: 4,
		line: 1,
		column: 13,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'billing' },
			{ type: 'const', value: 'shipping' },
			{ type: 'common', value: 'autofill field name' },
		],
		candicate: 'name',
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
		expects: [
			{ type: 'common', value: 'autofill field name' },
			{ type: 'const', value: 'home' },
			{ type: 'const', value: 'work' },
			{ type: 'const', value: 'mobile' },
			{ type: 'const', value: 'fax' },
			{ type: 'const', value: 'pager' },
		],
		candicate: 'name',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
	expect(check('section-foo shipping home neme')).toStrictEqual({
		matched: false,
		raw: 'neme',
		offset: 26,
		length: 4,
		line: 1,
		column: 27,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'tel' },
			{ type: 'const', value: 'tel-country-code' },
			{ type: 'const', value: 'tel-national' },
			{ type: 'const', value: 'tel-area-code' },
			{ type: 'const', value: 'tel-local' },
			{ type: 'const', value: 'tel-local-prefix' },
			{ type: 'const', value: 'tel-local-suffix' },
			{ type: 'const', value: 'tel-extension' },
			{ type: 'const', value: 'email' },
			{ type: 'const', value: 'impp' },
		],
		candicate: undefined,
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-tel',
	});
	expect(check('section-foo shipping home emall')).toStrictEqual({
		matched: false,
		raw: 'emall',
		offset: 26,
		length: 5,
		line: 1,
		column: 27,
		reason: 'unexpected-token',
		expects: [
			{ type: 'const', value: 'tel' },
			{ type: 'const', value: 'tel-country-code' },
			{ type: 'const', value: 'tel-national' },
			{ type: 'const', value: 'tel-area-code' },
			{ type: 'const', value: 'tel-local' },
			{ type: 'const', value: 'tel-local-prefix' },
			{ type: 'const', value: 'tel-local-suffix' },
			{ type: 'const', value: 'tel-extension' },
			{ type: 'const', value: 'email' },
			{ type: 'const', value: 'impp' },
		],
		candicate: 'email',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-tel',
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
	expect(check('section-foo section-bar')).toStrictEqual({
		matched: false,
		raw: 'section-bar',
		offset: 12,
		length: 11,
		line: 1,
		column: 13,
		partName: 'autofill named group',
		reason: 'duplicated',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section',
	});
});

test('duplicated part', () => {
	expect(check('shipping billing')).toStrictEqual({
		matched: false,
		raw: 'billing',
		offset: 9,
		length: 7,
		line: 1,
		column: 10,
		reason: 'duplicated',
		expects: [{ type: 'format', value: 'autocomplete' }],
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping',
	});
});

test('typo', () => {
	expect(check('secsion-foo name')).toStrictEqual({
		matched: false,
		raw: 'secsion-foo',
		offset: 0,
		length: 11,
		line: 1,
		column: 1,
		reason: 'unexpected-token',
		expects: [
			{ type: 'common', value: 'autofill named group' },
			{ type: 'common', value: 'autofill field name' },
		],
		candicate: 'section-foo',
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field',
	});
});
