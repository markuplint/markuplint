import { describe, test, expect } from 'vitest';

import { Parser } from './parser.js';

class FragmentParser extends Parser {}

function scan(raw: string) {
	const parser = new FragmentParser();
	return parser
		.parseCodeFragment({ raw, offset: 0, line: 1, col: 1, depth: 0, parentNode: null })
		.map(node => `${node.type}:${node.nodeName}:${node.raw}`);
}

describe('parseCodeFragment', () => {
	test.each([
		['<$a>x</$a>', ['starttag:$a:<$a>', 'text:#text:x', 'endtag:$a:</$a>']],
		['<_a>x</_a>', ['starttag:_a:<_a>', 'text:#text:x', 'endtag:_a:</_a>']],
		['<Éa>x</Éa>', ['starttag:Éa:<Éa>', 'text:#text:x', 'endtag:Éa:</Éa>']],
		['<$ui.Item />', ['starttag:$ui.Item:<$ui.Item />']],
	])('a tag name may start with any IdentifierStart: %s', (raw, expected) => {
		expect(scan(raw)).toStrictEqual(expected);
	});

	// A `<` that starts no tag name comes out as a nameless token, which the callers take for text.
	test.each(['a < b', '<3', 'a <- b', '< ', '<#a>', '<-a>'])('"%s" has no named tag', raw => {
		expect(scan(raw).filter(node => !/^(?:text:#text|(?:start|end)tag:#jsx-fragment):/.test(node))).toStrictEqual(
			[],
		);
	});
});
