import { describe, expect, test } from 'vitest';

import { ConfigLoadError } from './config-error.js';
import { ConfigParserError, ParserError, TargetParserError } from './parser-error.js';
import { InvalidSelectorError } from './selector-error.js';

describe('ParserError', () => {
	test('assigns defaults when info is empty', () => {
		const err = new ParserError('bad syntax', {});
		expect(err.message).toBe('bad syntax');
		expect(err.line).toBe(1);
		expect(err.col).toBe(0);
		expect(err.raw).toBe('');
		expect(err.name).toBe('ParserError');
	});

	test('uses provided values', () => {
		const err = new ParserError('bad', { line: 5, col: 10, raw: '<div' });
		expect(err.line).toBe(5);
		expect(err.col).toBe(10);
		expect(err.raw).toBe('<div');
	});

	test('is an instance of Error', () => {
		const err = new ParserError('x', {});
		expect(err).toBeInstanceOf(Error);
	});
});

describe('TargetParserError', () => {
	test('includes nodeName in message when provided', () => {
		const err = new TargetParserError('unclosed', { line: 3, col: 7, nodeName: 'div' });
		expect(err.message).toBe('The div is invalid element (3:7): unclosed');
		expect(err.nodeName).toBe('div');
		expect(err.name).toBe('TargetParserError');
	});

	test('uses plain message when nodeName is omitted', () => {
		const err = new TargetParserError('unclosed', { line: 1, col: 1 });
		expect(err.message).toBe('unclosed');
		expect(err.nodeName).toBeNull();
	});

	test('inherits from ParserError', () => {
		const err = new TargetParserError('x', {});
		expect(err).toBeInstanceOf(ParserError);
	});
});

describe('ConfigParserError', () => {
	test('includes file path and position in message', () => {
		const err = new ConfigParserError('unexpected token', { line: 2, col: 5, filePath: '/a.json' });
		expect(err.message).toBe('unexpected token in /a.json(2:5)');
		expect(err.filePath).toBe('/a.json');
		expect(err.name).toBe('ConfigParserError');
	});

	test('omits position when col is undefined', () => {
		const err = new ConfigParserError('bad', { filePath: '/a.json' });
		expect(err.message).toBe('bad in /a.json');
	});

	test('omits position when line is undefined', () => {
		const err = new ConfigParserError('bad', { col: 5, filePath: '/a.json' });
		expect(err.message).toBe('bad in /a.json');
	});

	test('inherits from ParserError', () => {
		const err = new ConfigParserError('x', { filePath: '/a' });
		expect(err).toBeInstanceOf(ParserError);
	});
});

describe('ConfigLoadError', () => {
	test('includes referrer in message', () => {
		const err = new ConfigLoadError('not found', '/cfg.json', '/parent.json');
		expect(err.message).toBe('not found in /parent.json');
		expect(err.filePath).toBe('/cfg.json');
		expect(err.referrer).toBe('/parent.json');
		expect(err.name).toBe('ConfigLoadError');
	});
});

describe('InvalidSelectorError', () => {
	test('default message includes the selector', () => {
		const err = new InvalidSelectorError('div>>span');
		expect(err.message).toBe('Invalid selector: "div>>span"');
		expect(err.selector).toBe('div>>span');
		expect(err.name).toBe('InvalidSelectorError');
	});

	test('uses custom message when provided', () => {
		const err = new InvalidSelectorError('x', 'custom msg');
		expect(err.message).toBe('custom msg');
	});
});
