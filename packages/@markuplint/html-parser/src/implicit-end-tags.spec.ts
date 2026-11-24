import type { MLASTElement, MLASTNodeTreeItem } from '@markuplint/ml-ast';

import { parse as parse5, parseFragment as parseFragment5, serialize } from 'parse5';
import { describe, expect, test } from 'vitest';

import { parseWithImplicitEndTags } from './implicit-end-tags.js';
import { parser } from './index.js';

const parse = parser.parse.bind(parser);

const invalidNodes = (nodeList: readonly MLASTNodeTreeItem[]) => nodeList.filter(node => node.type === 'invalid');

/** Every node that can be reached through the child nodes from the nodes that have no parent. */
const unlisted = (nodeList: readonly MLASTNodeTreeItem[]) => {
	const found: MLASTNodeTreeItem[] = [];
	const visit = (list: readonly MLASTNodeTreeItem[]) => {
		for (const node of list) {
			found.push(node);
			if ('childNodes' in node) {
				visit(node.childNodes);
			}
		}
	};
	visit(nodeList.filter(node => !node.parentNode));
	const listed = new Set(nodeList.map(node => node.uuid));
	return found.filter(node => !listed.has(node.uuid));
};

/**
 * @param code - The source
 * @param name - The element name
 * @param nth - Which of the start tags of the name
 * @returns The start tag and the end tag that is paired with it
 */
function pairOf(code: string, name: string, nth = 0) {
	const { nodeList } = parse(code);
	const start = nodeList.filter((n): n is MLASTElement => n.type === 'starttag' && n.nodeName === name)[nth];
	const end = nodeList.find(n => n.uuid === start?.pairNodeUuid);
	return { start, end };
}

describe('the end tag of an element whose start tag is omitted', () => {
	test.each([
		['html', '<!doctype html><head></head><body></body></html>', '</html>'],
		['head', '<!doctype html><html><title>t</title></head><body></body></html>', '</head>'],
		['body', '<!doctype html><html><head></head><p>x</p></body></html>', '</body>'],
		['tbody', '<!doctype html><table><tr><td>x</td></tr></tbody></table>', '</tbody>'],
		['colgroup', '<!doctype html><table><col></colgroup><tr><td>x</td></tr></table>', '</colgroup>'],
		['html', '<!doctype html><frameset></frameset></html>', '</html>'],
		['tbody', '<table><tr><td>x</td></tr></tbody></table>', '</tbody>'],
		['colgroup', '<table><col></colgroup><tr><td>x</td></tr></table>', '</colgroup>'],
	])('is paired with the element that the parser made: %s of %j', (name, code, endTag) => {
		const { start, end } = pairOf(code, name);
		expect(start?.isGhost).toBe(true);
		expect(start?.raw).toBe('');
		expect(end?.raw).toBe(endTag);
		expect(invalidNodes(parse(code).nodeList)).toStrictEqual([]);
	});

	test('of `body` is paired when `html` is written and `body` is not', () => {
		const code = '<!doctype html><html><head></head><p>x</p></body></html>';
		expect(pairOf(code, 'html').start?.isGhost).toBe(false);
		expect(pairOf(code, 'html').end?.raw).toBe('</html>');
		expect(pairOf(code, 'body').start?.isGhost).toBe(true);
		expect(pairOf(code, 'body').end?.raw).toBe('</body>');
		expect(invalidNodes(parse(code).nodeList)).toStrictEqual([]);
	});

	test.each([
		'<!doctype html><head></head><body></body></html>',
		'<!doctype html><title>t</title></head><p>x</p></body></html>',
		'<!doctype html><p>x</p>\n</body>\n</html>\n',
		'<!doctype html><p>x</p>\n</html>\n',
		'<!doctype html><title>t</title><div>x\n</body>\n</html>',
		'<!doctype html><title>t</title><p><b>x</p>\n</body>\n</html>\n',
		'<!doctype html><title>t</title><ul><li>x\n</body>\n</html>\n',
	])('is in the node list once, and every node of the tree is in the node list: %j', code => {
		const { nodeList } = parse(code);
		expect(unlisted(nodeList)).toStrictEqual([]);
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		const ends = nodeList.filter(n => n.type === 'endtag').map(n => n.offset);
		expect(new Set(ends).size).toBe(ends.length);
	});

	test.each([
		'<!doctype html><p>x</p>\n</html>\n',
		'<!doctype html><p>x</p>\n</body>\n</html>\n',
		'<!doctype html>\n<head><title>t</title><math></math>\n</head>\n<body></body>\n',
		'<!doctype html><title>t</title></head><p>x</p></body>y</html>z',
		'<!doctype html>\r\n<p>x</p>\r\n</body>\r\n</html>\r\n',
	])('keeps every character of the source in the node list: %j', code => {
		const covered = parse(code)
			.nodeList.filter(n => n.type !== 'starttag' || n.raw !== '')
			.toSorted((a, b) => a.offset - b.offset)
			.map(n => n.raw)
			.join('');
		expect(covered).toBe(code);
	});

	test('is in order by offset', () => {
		const { nodeList } = parse('<!doctype html><title>t</title></head><p>x</p></body></html>');
		const offsets = nodeList.map(n => n.offset);
		expect(offsets).toStrictEqual(offsets.toSorted((a, b) => a - b));
	});

	test('is at its own line and column when the source has CRLF', () => {
		const { nodeList } = parse('<!doctype html>\r\n<p>x</p>\r\n</body>\r\n</html>\r\n');
		const position = (raw: string) => {
			const node = nodeList.find(n => n.raw === raw);
			return `${node?.line}:${node?.col}`;
		};
		expect(position('</body>')).toBe('3:1');
		expect(position('</html>')).toBe('4:1');
	});

	test('of `head` ends where it is written, and the ghost `body` starts after it', () => {
		const { nodeList } = parse('<!doctype html><title>t</title></head><p>x</p>');
		const head = nodeList.find(n => n.type === 'starttag' && n.nodeName === 'head');
		const headEnd = nodeList.find(n => n.type === 'endtag' && n.nodeName === 'head');
		const body = nodeList.find(n => n.type === 'starttag' && n.nodeName === 'body');
		expect([head?.raw, head?.offset]).toStrictEqual(['', 15]);
		expect([headEnd?.raw, headEnd?.offset]).toStrictEqual(['</head>', 31]);
		expect([body?.raw, body?.offset]).toStrictEqual(['', 38]);
	});

	test.each(['<!doctype html><p>x', '<!doctype html>', '<!doctype html><table><tr><td>x', '<p>x'])(
		'is not made up for an element that the source does not close: %j',
		code => {
			const { nodeList } = parse(code);
			expect(nodeList.filter(n => n.type === 'endtag')).toStrictEqual([]);
			const ghosts = nodeList.filter((n): n is MLASTElement => n.type === 'starttag' && n.isGhost);
			expect(ghosts.map(n => n.pairNodeUuid ?? null)).toStrictEqual(ghosts.map(() => null));
		},
	);

	test('is not taken from an element that the parser made again for a misnested formatting element', () => {
		const { nodeList } = parse('<!doctype html><p><a href="#x"><div>x</div></a></p>');
		const repeated = nodeList.filter(
			(n): n is MLASTElement => n.type === 'starttag' && n.nodeName === 'a' && n.raw === '',
		);
		expect(repeated.map(n => n.pairNodeUuid)).toStrictEqual([null]);
	});

	test.each([
		['<!doctype html><body><p>x</p></p></body>', ['</p>']],
		['<!doctype html><body></br></body>', ['</br>']],
		['<!doctype html><table><td>x</td></tr></table>', ['</tr>']],
		['<!doctype html><frameset></frameset></html></html>', ['</html>']],
		['<!doctype html><html><head></head><body><p>x</p></body></body></html>', ['</body>']],
	])('that the Standard does not let a start tag omit is still orphaned: %j', (code, orphaned) => {
		expect(invalidNodes(parse(code).nodeList).map(n => n.raw)).toStrictEqual(orphaned);
	});

	test('of `tbody` that is repeated pairs one of them, and leaves the other orphaned', () => {
		const code = '<!doctype html><table><tr><td>x</td></tr></tbody></tbody></table>';
		const { start, end } = pairOf(code, 'tbody');
		expect(start?.isGhost).toBe(true);
		expect(end?.raw).toBe('</tbody>');
		expect(invalidNodes(parse(code).nodeList).map(n => n.raw)).toStrictEqual(['</tbody>']);
	});
});

describe('the parse of parse5 that records the end tag of an implicit element', () => {
	test.each([
		'<!doctype html><head></head><body></body></html>',
		'<!doctype html><table><tr><td>x</td></tr></tbody></table>',
		'<!doctype html><frameset></frameset></html>',
		'<!doctype html><p><a href="#x"><div>x</div></a></p>',
		'<!doctype html><template><tr><td>x</td></tr></template>',
		'<!doctype html>',
		'',
	])('builds the same tree as `parse` of parse5: %j', code => {
		const options = { scriptingEnabled: false, sourceCodeLocationInfo: true } as const;
		expect(serialize(parseWithImplicitEndTags(code, false, options).root)).toBe(serialize(parse5(code, options)));
	});

	test.each(['<table><tr><td>x</td></tr></tbody></table>', '<td>x</td>', '<title>t</title><p>x', ''])(
		'builds the same tree as `parseFragment` of parse5: %j',
		code => {
			const options = { scriptingEnabled: false, sourceCodeLocationInfo: true } as const;
			expect(serialize(parseWithImplicitEndTags(code, true, options).root)).toBe(
				serialize(parseFragment5(code, options)),
			);
		},
	);
});
