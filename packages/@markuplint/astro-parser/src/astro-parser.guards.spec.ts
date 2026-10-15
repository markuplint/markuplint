import { ParserError } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { astroParse } from './astro-parser.js';

/**
 * `astro-eslint-parser` v3 accepts an unterminated frontmatter and an unclosed HTML comment
 * without an error or a diagnostic, so `astroParse` detects them itself.
 */
describe('unterminated frontmatter', () => {
	test('a frontmatter fence that is never closed is a parse error at the fence', () => {
		const fn = () => astroParse('---\nconst a = 1;\n<p></p>');
		expect(fn).toThrow(ParserError);
		expect(fn).toThrow('Unterminated frontmatter');
		expect(fn).toThrow(expect.objectContaining({ line: 1, col: 1 }));
	});

	test('a fence after leading blank lines is detected as well', () => {
		expect(() => astroParse('\n---\nconst a = 1;\n<p></p>')).toThrow('Unterminated frontmatter');
	});

	test('an empty frontmatter is not unterminated', () => {
		expect(() => astroParse('---\n---\n<p></p>')).not.toThrow();
	});

	test('a frontmatter without a body is not unterminated', () => {
		expect(() => astroParse('---\nconst a = 1;\n---')).not.toThrow();
	});

	test('a template without a frontmatter is not affected', () => {
		expect(() => astroParse('<p>--- not a fence ---</p>')).not.toThrow();
	});
});

describe('unclosed HTML comment', () => {
	test('the content from an unclosed comment on is a parse error at the point parsing stopped', () => {
		const fn = () => astroParse('<p></p>\n<!-- c');
		expect(fn).toThrow(ParserError);
		expect(fn).toThrow('Unterminated syntax: the template is not parsed to its end');
		expect(fn).toThrow(expect.objectContaining({ line: 2, col: 1 }));
	});

	test('a source that does not end with a newline is parsed to its end', () => {
		expect(() => astroParse('<p></p>')).not.toThrow();
	});

	test('a source that ends with a comment is parsed to its end', () => {
		expect(() => astroParse('<p></p>\n<!-- c -->')).not.toThrow();
	});

	test('an empty source is parsed to its end', () => {
		expect(() => astroParse('')).not.toThrow();
	});

	test('a frontmatter-only file that ends with a newline is parsed to its end', () => {
		expect(() => astroParse('---\nconst a = 1;\n---\n')).not.toThrow();
	});

	test('blank lines after the last element are parsed to the end', () => {
		expect(() => astroParse('<p></p>\n\n\n')).not.toThrow();
	});

	test('CRLF line endings are parsed to the end', () => {
		expect(() => astroParse('---\r\nconst a = 1;\r\n---\r\n<p></p>\r\n')).not.toThrow();
	});

	test('a leading byte order mark is parsed to the end', () => {
		expect(() => astroParse('﻿---\nconst a = 1;\n---\n<p></p>\n')).not.toThrow();
	});
});
