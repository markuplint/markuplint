import { checkMIMEType } from './check-mime-type';

const check = checkMIMEType();
const checkNoParam = checkMIMEType({ withoutParameters: true });

test('valid', () => {
	expect(check('x/y').matched).toBe(true);
	expect(check('x/y;a=b;c=D;E="F"').matched).toBe(true);
});

test('excrescence-token', () => {
	expect(check('xy;')).toStrictEqual({
		column: 1,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 3,
		line: 1,
		matched: false,
		offset: 0,
		raw: 'xy;',
		reason: 'syntax-error',
		ref: null,
	});
	expect(check('x/y;')).toStrictEqual({
		candicate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type' }],
		length: 1,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';',
		reason: 'extra-token',
		ref: null,
	});
	expect(checkNoParam('x/y;')).toStrictEqual({
		candicate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 1,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';',
		reason: 'extra-token',
		ref: null,
	});
	expect(checkNoParam('x/y;a=b;c=D;E="F"')).toStrictEqual({
		candicate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 14,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';a=b;c=D;E="F"',
		reason: 'extra-token',
		ref: null,
	});
});
