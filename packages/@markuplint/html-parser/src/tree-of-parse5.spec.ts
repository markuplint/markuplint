import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';
import type { DefaultTreeAdapterMap } from 'parse5';

import { parse as parse5 } from 'parse5';
import { describe, expect, test } from 'vitest';

import { parser } from './index.js';

type Parse5Node = DefaultTreeAdapterMap['node'];

const SHORT: Readonly<Record<string, string>> = {
	'http://www.w3.org/1999/xhtml': 'html',
	'http://www.w3.org/2000/svg': 'svg',
	'http://www.w3.org/1998/Math/MathML': 'mathml',
};

/**
 * One line per element (its name and namespace) and per run of text, indented by depth. Adjacent text is one line, as
 * the DOM has one text node where the source has text on both sides of a tag that the parser ignores. The text of
 * parse5 is decoded and that of the AST is the source, so an input has no character reference.
 */
function fromParse5(node: Parse5Node, depth: number, out: string[]) {
	const children = 'childNodes' in node ? node.childNodes : [];
	let text: string | null = null;
	const flush = () => {
		if (text !== null) {
			out.push(`${'  '.repeat(depth)}#text ${JSON.stringify(text)}`);
			text = null;
		}
	};
	for (const child of children) {
		if (child.nodeName === '#text' && 'value' in child) {
			text = (text ?? '') + child.value;
			continue;
		}
		if (!('tagName' in child)) {
			continue;
		}
		flush();
		out.push(
			`${'  '.repeat(depth)}${child.tagName.toLowerCase()} ${SHORT[child.namespaceURI] ?? child.namespaceURI}`,
		);
		fromParse5(child.nodeName === 'template' && 'content' in child ? child.content : child, depth + 1, out);
	}
	flush();
	return out;
}

function fromMarkuplint(children: readonly MLASTNodeTreeItem[], depth: number, out: string[]) {
	let text: string | null = null;
	const flush = () => {
		if (text !== null) {
			out.push(`${'  '.repeat(depth)}#text ${JSON.stringify(text)}`);
			text = null;
		}
	};
	for (const child of children) {
		if (child.type === 'text') {
			text = (text ?? '') + child.raw;
			continue;
		}
		if (child.type !== 'starttag') {
			continue;
		}
		flush();
		out.push(`${'  '.repeat(depth)}${child.nodeName.toLowerCase()} ${SHORT[child.namespace] ?? child.namespace}`);
		fromMarkuplint(child.childNodes, depth + 1, out);
	}
	flush();
	return out;
}

const treeOfParse5 = (code: string) => fromParse5(parse5(code), 0, []);

const treeOfMarkuplint = (code: string) =>
	fromMarkuplint(
		parser.parse(code).nodeList.filter(node => !node.parentNodeUuid),
		0,
		[],
	);

/**
 * Inputs whose tree differed from the one that the HTML parsing algorithm builds: the content of `style` and `script`
 * of SVG and MathML, which is markup there; the namespace of what is in an integration point; the text after an
 * orphaned end tag; a second `</html>`; the white space after the end of `body`; the end tag of an element that the
 * parser makes again for a misnested formatting element; content after the end of `body` in an element still open.
 */
const INPUTS = [
	'<!doctype html><body><svg><style>a <g></g> b</style></svg></body>',
	'<!doctype html><body><svg><script>a <circle r="1"></circle> b</script></svg></body>',
	'<!doctype html><body><math><style>a <mi>x</mi></style></math></body>',
	'<!doctype html><body><math><mi><iframe>x</iframe></mi></math></body>',
	'<!doctype html><body><math><mo><span>x</span></mo><mn><mglyph></mglyph></mn></math></body>',
	'<!doctype html><body><math><mtext><div>x</div></mtext></math></body>',
	'<!doctype html><body><math><annotation-xml encoding="text/html"><div>x</div></annotation-xml></math></body>',
	'<!doctype html><body><math><annotation-xml><svg><rect></rect></svg></annotation-xml></math></body>',
	'<!doctype html><body><svg><desc><div>x</div></desc><title><span>x</span></title></svg></body>',
	'<!doctype html><body><svg><foreignObject><div>x</div></foreignObject></svg></body>',
	'<!doctype html><html><body><p>a</p></body>b</expected>c<div>x</div></html>',
	'<!doctype html><body><p>a</expected>b</p></body>',
	'<!doctype html><html><body></body></html>\n</html>',
	'<!doctype html><html><body></body></html>x</html>',
	'<!doctype html><html><body><p>x</p>\n</body>\n</html>\n',
	'<!doctype html><body><b><i>x</b> y</i> z</body>',
	'<!doctype html><body><p><b>x <div>y</div> z</b></p></body>',
	'<!doctype html><body><div></body><p>x</p>',
	'<!doctype html><body><div></html><p>z</p>',
];

describe('the tree is the one that parse5 builds', () => {
	test.each(INPUTS)('%s', code => {
		expect(treeOfMarkuplint(code)).toStrictEqual(treeOfParse5(code));
	});
});

describe('the content of the HTML `style`, `script` and `xmp`', () => {
	test.each(['style', 'script', 'xmp'])('is not taken for markup, next to the `%s` of SVG', name => {
		const { nodeList } = parser.parse(
			`<!doctype html><body><svg><${name}>a <g></g></${name}></svg><${name}>b <i>c</i></${name}></body>`,
		);
		expect(nodeList.filter(node => node.type === 'starttag').map(node => node.nodeName)).toStrictEqual([
			'html',
			'head',
			'body',
			'svg',
			name,
			'g',
			name,
		]);
	});
});

describe('the tree of a few of the inputs, written out', () => {
	test('the content of the `style` of SVG is markup', () => {
		expect(treeOfMarkuplint('<!doctype html><body><svg><style>a <g></g> b</style></svg></body>')).toStrictEqual([
			'html html',
			'  head html',
			'  body html',
			'    svg svg',
			'      style svg',
			'        #text "a "',
			'        g svg',
			'        #text " b"',
		]);
	});

	test('what is in a MathML text integration point is HTML', () => {
		expect(treeOfMarkuplint('<!doctype html><body><math><mi><iframe>x</iframe></mi></math></body>')).toStrictEqual([
			'html html',
			'  head html',
			'  body html',
			'    math mathml',
			'      mi mathml',
			'        iframe html',
			'          #text "x"',
		]);
	});

	test('the text after an orphaned end tag is in the element that the text is in', () => {
		expect(treeOfMarkuplint('<!doctype html><body><p>a</expected>b</p></body>')).toStrictEqual([
			'html html',
			'  head html',
			'  body html',
			'    p html',
			'      #text "ab"',
		]);
	});
});

describe('the end tags', () => {
	const endTags = (code: string) =>
		parser
			.parse(code)
			.nodeList.filter(node => node.type === 'endtag' || node.type === 'invalid')
			.map(node => `${node.type} ${node.raw} ${node.offset}`);

	test.each([
		['<!doctype html><html><body></body></html>\n</html>', 42],
		['<!doctype html><html><body></body></html>x</html>', 42],
	])('a second `</html>` is a node that no element owns: %j', (code, offset) => {
		expect(endTags(code)).toStrictEqual(['endtag </body> 27', 'endtag </html> 34', `invalid </html> ${offset}`]);
	});

	test('the end tag of an element that the parser makes again is its end tag', () => {
		expect(endTags('<!doctype html><body><b><i>x</b> y</i></body>')).toStrictEqual([
			'endtag </b> 28',
			'endtag </i> 34',
			'endtag </body> 38',
		]);
	});
});
