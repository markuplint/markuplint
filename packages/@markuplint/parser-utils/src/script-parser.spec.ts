import { test, expect, describe } from 'vitest';

import { safeScriptParser, scriptParser } from './script-parser.js';

describe('scriptParser', () => {
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
});

describe('safeScriptParser', () => {
	test('valid', () => {
		expect(safeScriptParser('valid')).toStrictEqual({
			validScript: 'valid',
			leftover: '',
		});
	});

	test(' 1 + 1 ', () => {
		expect(safeScriptParser(' 1 + 1 ')).toStrictEqual({
			validScript: ' 1 + 1 ',
			leftover: '',
		});
	});

	test(' 1 + 1 -', () => {
		expect(safeScriptParser(' 1 + 1 -')).toStrictEqual({
			validScript: ' 1 + 1 ',
			leftover: '-',
		});
	});

	test(' 1 + 1 - ', () => {
		expect(safeScriptParser(' 1 + 1 - ')).toStrictEqual({
			validScript: ' 1 + 1 ',
			leftover: '- ',
		});
	});

	test('typeof a ==="number"', () => {
		expect(safeScriptParser('typeof a ==="number"')).toStrictEqual({
			validScript: 'typeof a ==="number"',
			leftover: '',
		});
	});

	test(' 1 + 1 typeof', () => {
		expect(safeScriptParser(' 1 + 1 typeof')).toStrictEqual({
			validScript: ' 1 + 1 ',
			leftover: 'typeof',
		});
	});

	test(' ...spread ', () => {
		expect(safeScriptParser(' ...spread ')).toStrictEqual({
			validScript: ' ...spread ',
			leftover: '',
		});
	});

	test(' ...spread } invalid=invalid', () => {
		expect(safeScriptParser(' ...spread } invalid=invalid')).toStrictEqual({
			validScript: ' ...spread ',
			leftover: '} invalid=invalid',
		});
	});

	test('classList.map((c) => `${c.toLowerCase()}`).join(",")} ', () => {
		expect(safeScriptParser('classList.map((c) => `${c.toLowerCase()}`).join(",")} ')).toStrictEqual({
			validScript: 'classList.map((c) => `${c.toLowerCase()}`).join(",")',
			leftover: '} ',
		});
	});

	test("{color: 'red', background: 'green'}", () => {
		expect(safeScriptParser("{color: 'red', background: 'green'}")).toStrictEqual({
			validScript: "{color: 'red', background: 'green'}",
			leftover: '',
		});
	});
});
