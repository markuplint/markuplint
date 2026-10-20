import { describe, test, expect } from 'vitest';

import { Parser } from './parser.js';

class DefaultParser extends Parser {}

// A parser of a language whose element names start otherwise (JSX: an ECMAScript `IdentifierStart`)
class IdentifierStartParser extends Parser {
	isTagNameStart(char: string) {
		return /[\p{ID_Start}$_]/u.test(char);
	}
}

const fragment = (raw: string) => ({ raw, offset: 0, line: 1, col: 1, depth: 0, parentNode: null });
// A `<` that no tag name follows is read as a nameless tag (`#jsx-fragment`), not as an element
const tagNames = (parser: Parser, raw: string) =>
	parser
		.parseCodeFragment(fragment(raw))
		.filter(node => node.type === 'starttag' && node.nodeName !== '#jsx-fragment')
		.map(node => node.nodeName);

describe('Parser#isTagNameStart', () => {
	test('is an ASCII letter by default, as the tag open state of the HTML tokenizer', () => {
		const parser = new DefaultParser();
		expect(['a', 'Z', '$', '_', '3', 'É', ' ', '/'].filter(char => parser.isTagNameStart(char))).toStrictEqual([
			'a',
			'Z',
		]);
	});

	test('reads no element from `a < b`, `<3`, `<$a>`, `<_a>` and `<Éa>` by default', () => {
		expect(tagNames(new DefaultParser(), 'a < b <3 <$a> <_a> <Éa> <i>')).toStrictEqual(['i']);
	});

	test('reads the tag that an override lets start', () => {
		expect(tagNames(new IdentifierStartParser(), '<$a> <_a> <Éa> <𠮷a> <i>')).toStrictEqual([
			'$a',
			'_a',
			'Éa',
			'𠮷a',
			'i',
		]);
	});

	test('reads no element from `a < b` and `<3` when an override lets `$` and `_` start', () => {
		expect(tagNames(new IdentifierStartParser(), 'a < b <3 <i>')).toStrictEqual(['i']);
	});
});
