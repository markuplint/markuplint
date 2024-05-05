import { parse as tsParse } from '@typescript-eslint/typescript-estree';
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

describe('Issues', () => {
	test('#1579', () => {
		expect(safeScriptParser('(e) => { setValue(e.target.value as Value); } }>')).toStrictEqual({
			validScript: '(e) => { setValue(e.target.value ',
			leftover: 'as Value); } }>',
		});

		expect(
			safeScriptParser('(e) => { setValue(e.target.value as Value); } }>', script => {
				try {
					tsParse(script, {
						comment: true,
						errorOnUnknownASTType: false,
						jsx: true,
						loc: true,
						range: true,
						tokens: false,
						useJSXTextNode: true,
					});
				} catch (error) {
					if (
						error instanceof Error &&
						'location' in error &&
						error.location instanceof Object &&
						'start' in error.location &&
						error.location.start instanceof Object &&
						'offset' in error.location.start &&
						typeof error.location.start.offset === 'number'
					) {
						const newError = new SyntaxError(error.message);
						// @ts-ignore
						newError.index = error.location.start.offset;
						throw newError;
					} else {
						throw error;
					}
				}
			}),
		).toStrictEqual({
			validScript: '(e) => { setValue(e.target.value as Value); } ',
			leftover: '}>',
		});
	});
});
