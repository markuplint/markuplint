import { describe, expect, test } from 'vitest';

import { ConfigLoadError } from './config-error.js';
import { isFatalError } from './guards.js';
import { ConfigParserError, ParserError } from './parser-error.js';
import { InvalidSelectorError } from './selector-error.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

describe('isFatalError', () => {
	test('TypeError is fatal', () => {
		expect(isFatalError(new TypeError('x'))).toBe(true);
	});

	test('ReferenceError is fatal', () => {
		expect(isFatalError(new ReferenceError('x'))).toBe(true);
	});

	test('RangeError is fatal', () => {
		expect(isFatalError(new RangeError('x'))).toBe(true);
	});

	test('SyntaxError is fatal', () => {
		expect(isFatalError(new SyntaxError('x'))).toBe(true);
	});

	test('UnexpectedCallError is fatal', () => {
		expect(isFatalError(new UnexpectedCallError('x'))).toBe(true);
	});

	test('non-Error throw (string) is fatal', () => {
		expect(isFatalError('string throw')).toBe(true);
	});

	test('non-Error throw (null) is fatal', () => {
		expect(isFatalError(null)).toBe(true);
	});

	test('non-Error throw (undefined) is fatal', () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		expect(isFatalError(undefined)).toBe(true);
	});

	test('ParserError is NOT fatal', () => {
		expect(isFatalError(new ParserError('x', {}))).toBe(false);
	});

	test('ConfigLoadError is NOT fatal', () => {
		expect(isFatalError(new ConfigLoadError('x', '/a', '/b'))).toBe(false);
	});

	test('ConfigParserError is NOT fatal', () => {
		expect(isFatalError(new ConfigParserError('x', { filePath: '/a' }))).toBe(false);
	});

	test('InvalidSelectorError is NOT fatal', () => {
		expect(isFatalError(new InvalidSelectorError('div>>span'))).toBe(false);
	});

	test('generic Error is NOT fatal', () => {
		expect(isFatalError(new Error('x'))).toBe(false);
	});
});
