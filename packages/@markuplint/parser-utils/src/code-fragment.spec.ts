import type { MLASTElement, MLASTTag, MLASTText } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { Parser } from './parser.js';

class DefaultParser extends Parser {}

// A language that closes an element only with `/>` or its end tag (`<br>` is not closed by its name)
class XmlParser extends Parser {
	constructor() {
		super({ selfCloseType: 'xml' });
	}
}

const HTML = 'http://www.w3.org/1999/xhtml';
const SVG = 'http://www.w3.org/2000/svg';

const fragment = (raw: string) => ({ raw, offset: 0, line: 1, col: 1, depth: 0, parentNode: null });

const describeNodes = (nodes: readonly (MLASTTag | MLASTText)[]) =>
	nodes.map(node =>
		node.type === 'starttag'
			? `${node.nodeName} ${node.namespace === SVG ? 'svg' : node.namespace === HTML ? 'html' : node.namespace}`
			: `${node.type} ${JSON.stringify(node.raw)}`,
	);

describe('Parser#parseCodeFragment', () => {
	test('a start tag is in the namespace that the open elements of the fragment give', () => {
		const nodes = new DefaultParser().parseCodeFragment(
			fragment('<svg><foreignObject><div></div></foreignObject><g></g></svg><p></p>'),
		);
		expect(describeNodes(nodes.filter(node => node.type === 'starttag'))).toStrictEqual([
			'svg svg',
			'foreignObject svg',
			'div html',
			'g svg',
			'p html',
		]);
	});

	test('a void element of HTML is not the parent of what follows it', () => {
		const nodes = new XmlParser().parseCodeFragment(fragment('<math><mtext><br><mglyph></mglyph></mtext></math>'));
		expect(describeNodes(nodes.filter(node => node.type === 'starttag'))).toStrictEqual([
			'math http://www.w3.org/1998/Math/MathML',
			'mtext http://www.w3.org/1998/Math/MathML',
			'br html',
			'mglyph http://www.w3.org/1998/Math/MathML',
		]);
	});

	test('the content of the `style` of SVG is markup, that of the `script` of HTML in SVG is text', () => {
		const nodes = new DefaultParser().parseCodeFragment(
			fragment(
				'<svg><style>a <g></g></style><foreignObject><script>s.replace(/<br\\s*\\/?>/g, "")</script></foreignObject></svg>',
			),
		);
		expect(describeNodes(nodes)).toStrictEqual([
			'svg svg',
			'style svg',
			'text "a "',
			'g svg',
			'endtag "</g>"',
			'endtag "</style>"',
			'foreignObject svg',
			'script html',
			'text "s.replace(/<br\\\\s*\\\\/?>/g, \\"\\")"',
			'endtag "</script>"',
			'endtag "</foreignObject>"',
			'endtag "</svg>"',
		]);
	});

	test('an end tag that no start tag of the fragment opens moves the nodes after it to the parent', () => {
		const nodes = new DefaultParser().parseCodeFragment(fragment('<a><b>x</c>y</b></a>'));
		expect(nodes.map(node => `${node.raw} ${node.depth}`)).toStrictEqual([
			'<a> 0',
			'<b> 1',
			'x 2',
			'</c> 1',
			'y 1',
			'</b> 1',
			'</a> 0',
		]);
	});

	test('in a text that the language has placed, an end tag that no start tag opens closes nothing', () => {
		const nodes = new DefaultParser().parseCodeFragment(fragment('<a><b>x</c>y</b></a>'), { inPlacedText: true });
		expect(nodes.map(node => `${node.raw} ${node.depth}`)).toStrictEqual([
			'<a> 0',
			'<b> 1',
			'x 2',
			'</c> 2',
			'y 2',
			'</b> 1',
			'</a> 0',
		]);
	});
});

describe('Parser#isOwnedEndTag', () => {
	const body = { nodeName: 'body' } as MLASTElement;
	const div = { nodeName: 'div' } as MLASTElement;
	const tag = (nodeName: string) => ({ nodeName }) as MLASTTag;

	test('is the `</html>` in a text of `body` by default', () => {
		const parser = new DefaultParser();
		expect(parser.isOwnedEndTag(tag('html'), body)).toBe(true);
		expect(parser.isOwnedEndTag(tag('HTML'), body)).toBe(true);
		expect(parser.isOwnedEndTag(tag('html'), div)).toBe(false);
		expect(parser.isOwnedEndTag(tag('body'), body)).toBe(false);
		expect(parser.isOwnedEndTag(tag('html'), null)).toBe(false);
	});
});
