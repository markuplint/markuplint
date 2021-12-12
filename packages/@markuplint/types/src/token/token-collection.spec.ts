import { TokenCollection } from './token-collection';

import { Token } from '.';

test('parse', () => {
	expect(new TokenCollection(' a  b   c    ').toJSON()).toStrictEqual([
		{
			offset: 0,
			type: 13,
			value: ' ',
		},
		{
			offset: 1,
			type: 1,
			value: 'a',
		},
		{
			offset: 2,
			type: 13,
			value: '  ',
		},
		{
			offset: 4,
			type: 1,
			value: 'b',
		},
		{
			offset: 5,
			type: 13,
			value: '   ',
		},
		{
			offset: 8,
			type: 1,
			value: 'c',
		},
		{
			offset: 9,
			type: 13,
			value: '    ',
		},
	]);
});

test('parse camma separator', () => {
	expect(new TokenCollection('a,, ,b,cde', { separator: 'comma' }).toJSON()).toStrictEqual([
		{
			offset: 0,
			type: 1,
			value: 'a',
		},
		{
			offset: 1,
			type: 18,
			value: ',',
		},
		{
			offset: 2,
			type: 18,
			value: ',',
		},
		{
			offset: 3,
			type: 13,
			value: ' ',
		},
		{
			offset: 4,
			type: 18,
			value: ',',
		},
		{
			offset: 5,
			type: 1,
			value: 'b',
		},
		{
			offset: 6,
			type: 18,
			value: ',',
		},
		{
			offset: 7,
			type: 1,
			value: 'cde',
		},
	]);
});

test('A camma is an ident if the comma is not a separator', () => {
	expect(new TokenCollection('a ,cde , f').toJSON()).toStrictEqual([
		{
			offset: 0,
			type: 1,
			value: 'a',
		},
		{
			offset: 1,
			type: 13,
			value: ' ',
		},
		{
			offset: 2,
			type: 1,
			value: ',cde',
		},
		{
			offset: 6,
			type: 13,
			value: ' ',
		},
		{
			offset: 7,
			type: 1,
			value: ',',
		},
		{
			offset: 8,
			type: 13,
			value: ' ',
		},
		{
			offset: 9,
			type: 1,
			value: 'f',
		},
	]);
});

test('getConsecutiveToken', () => {
	expect(new TokenCollection('a,b,c', { separator: 'comma' }).getConsecutiveToken(Token.Comma)).toBeFalsy();
	expect(new TokenCollection('a,,b', { separator: 'comma' }).getConsecutiveToken(Token.Comma)).toBeTruthy();
	expect(new TokenCollection('a,,b', { separator: 'comma' }).getConsecutiveToken(Token.Comma)?.offset).toBe(2);
});

test('fromPatterns', () => {
	const patterns = [/\+|-/, /[0-9]{2}/, /:?/, /[0-9]{2}/];
	expect(TokenCollection.fromPatterns('+00:00', patterns).map(t => t.value)).toStrictEqual(['+', '00', ':', '00']);
	expect(TokenCollection.fromPatterns('+0000', patterns).map(t => t.value)).toStrictEqual(['+', '00', '', '00']);
	expect(TokenCollection.fromPatterns('+00/00', patterns).map(t => t.value)).toStrictEqual([
		'+',
		'00',
		'',
		'',
		'/00',
	]);
});
