import { test, expect } from 'vitest';

import { scriptParser } from './script-parser.js';

test('String', () => {
	expect(scriptParser('"abc"')).toStrictEqual([
		{
			type: 'String',
			value: '"abc"',
		},
	]);
});

test('String + Variable + String', () => {
	expect(scriptParser('"abc" + def + \'ghi\'')).toStrictEqual([
		{
			type: 'String',
			value: '"abc"',
		},
		{
			type: 'Punctuator',
			value: '+',
		},
		{
			type: 'Identifier',
			value: 'def',
		},
		{
			type: 'Punctuator',
			value: '+',
		},
		{
			type: 'String',
			value: "'ghi'",
		},
	]);
});

test('Template literal', () => {
	expect(scriptParser('`abc${def}ghi`')).toStrictEqual([
		{
			type: 'Template',
			value: '`abc${',
		},
		{
			type: 'Identifier',
			value: 'def',
		},
		{
			type: 'Template',
			value: '}ghi`',
		},
	]);
});

test('Number', () => {
	expect(scriptParser('123')).toStrictEqual([
		{
			type: 'Numeric',
			value: '123',
		},
	]);
});

test('Boolean', () => {
	expect(scriptParser('true')).toStrictEqual([
		{
			type: 'Boolean',
			value: 'true',
		},
	]);
});

test('Array', () => {
	expect(scriptParser('[0, false, ""]')).toStrictEqual([
		{
			type: 'Punctuator',
			value: '[',
		},
		{
			type: 'Numeric',
			value: '0',
		},
		{
			type: 'Punctuator',
			value: ',',
		},
		{
			type: 'Boolean',
			value: 'false',
		},
		{
			type: 'Punctuator',
			value: ',',
		},
		{
			type: 'String',
			value: '""',
		},
		{
			type: 'Punctuator',
			value: ']',
		},
	]);
});
