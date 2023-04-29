import { tokenize, defaultValueDelimiters } from './parse-attr';

describe('tokenize', () => {
	test('name', () => {
		expect(tokenize('a').name).toBe('a');
		expect(tokenize('abc').name).toBe('abc');
		expect(tokenize('abc:').name).toBe('abc:');
		expect(tokenize(':abc').name).toBe(':abc');
		expect(tokenize('xxx:abc').name).toBe('xxx:abc');
		expect(tokenize('@abc').name).toBe('@abc');
	});

	test('value', () => {
		expect(tokenize('a=b').value).toBe('b');
		expect(tokenize('abc=xyz').value).toBe('xyz');
		expect(tokenize('abc:="xyz"').value).toBe('xyz');
	});

	test('complex', () => {
		expect(tokenize(' @a:x.y\n= x + y ')).toStrictEqual({
			beforeName: ' ',
			name: '@a:x.y',
			afterName: '\n',
			equal: '=',
			beforeValue: '',
			startQuote: '',
			value: ' x + y ',
			endQuote: '',
			afterAttr: '',
		});

		expect(tokenize(' @a:x.y\n= " x\' + y " ')).toStrictEqual({
			beforeName: ' ',
			name: '@a:x.y',
			afterName: '\n',
			equal: '=',
			beforeValue: ' ',
			startQuote: '"',
			value: " x' + y ",
			endQuote: '"',
			afterAttr: ' ',
		});
	});

	test('jsx', () => {
		expect(
			tokenize(' className={classList.map((c) => `${c.toLowerCase()}`).join(",")} ', {
				valueDelimiters: [
					...defaultValueDelimiters,
					{
						start: '{',
						end: '}',
					},
				],
			}),
		).toStrictEqual({
			beforeName: ' ',
			name: 'className',
			afterName: '',
			equal: '=',
			beforeValue: '',
			startQuote: '{',
			value: 'classList.map((c) => `${c.toLowerCase()}`).join(",")',
			endQuote: '}',
			afterAttr: ' ',
		});
	});
});
