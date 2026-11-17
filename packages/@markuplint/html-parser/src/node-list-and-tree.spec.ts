import type { MLASTElement, MLASTNodeTreeItem } from '@markuplint/ml-ast';

import { describe, expect, test } from 'vitest';

import { parser } from './index.js';

/**
 * What the node list and the tree have to agree on: a node that is in the tree and not in the list is one that nothing
 * can map, and a rule that walks the nodes reports it as a broken mapping.
 */

/** Every node that can be reached through the child nodes from the nodes that have no parent. */
function reachable(nodes: readonly MLASTNodeTreeItem[]): MLASTNodeTreeItem[] {
	const found: MLASTNodeTreeItem[] = [];
	const visit = (list: readonly MLASTNodeTreeItem[]) => {
		for (const node of list) {
			found.push(node);
			if ('childNodes' in node) {
				visit(node.childNodes);
			}
		}
	};
	visit(nodes.filter(node => !node.parentNode));
	return found;
}

const document = (body: string) =>
	`<!doctype html><html lang="en"><head><title>t</title></head><body>${body}</body></html>`;

const unlisted = (nodeList: readonly MLASTNodeTreeItem[]) => {
	const listed = new Set(nodeList.map(node => node.uuid));
	return reachable(nodeList).filter(node => !listed.has(node.uuid));
};

/**
 * Elements that the HTML parsing algorithm makes again where a formatting element is misnested ("reconstruct the active
 * formatting elements"): the new element is made from the same start tag, so it has the same position in the source as
 * the element that it repeats.
 */
const MISNESTED = [
	'<p><a href="#x"><div>x</div></a></p>',
	'<b><i>x</b>y</i>',
	'<p><b>x<div>y</div>z</b></p>',
	'<p><b><i>x<div>y</div></i></b></p>',
];

describe('an element that the parser makes again for a misnested formatting element', () => {
	test.each(MISNESTED)('every node of the tree is in the node list: %s', code => {
		expect(unlisted(parser.parse(document(code)).nodeList)).toStrictEqual([]);
	});

	test('has no source of its own, as an element that the parser inserts without a tag has none', () => {
		const { nodeList } = parser.parse(document('<p><a href="#x"><div>x</div></a></p>'));
		const links = nodeList.filter(
			(node): node is MLASTElement => node.type === 'starttag' && node.nodeName === 'a',
		);
		expect(links.map(link => link.raw)).toStrictEqual(['<a href="#x">', '']);
	});

	test('is a child of the element that the parser put it in, with the text that is in it', () => {
		const { nodeList } = parser.parse(document('<p><a href="#x"><div>x</div></a></p>'));
		const div = nodeList.find((node): node is MLASTElement => node.type === 'starttag' && node.nodeName === 'div');
		const link = div?.childNodes.find((node): node is MLASTElement => node.nodeName === 'a');
		expect(link?.raw).toBe('');
		expect(link?.childNodes.map(node => node.raw)).toStrictEqual(['x']);
	});

	test('has no attributes, as it has no start tag to read them from', () => {
		const { nodeList } = parser.parse(document('<p><a href="#x"><div>x</div></a></p>'));
		const links = nodeList.filter(
			(node): node is MLASTElement => node.type === 'starttag' && node.nodeName === 'a',
		);
		expect(links.map(link => link.attributes.map(attribute => attribute.raw))).toStrictEqual([['href="#x"'], []]);
	});

	test('keeps each of the elements that are made again when they have the same name, which are at one position', () => {
		// the three `b` are made again inside the `div`, one in the other, and the first child of an element starts where
		// its parent's start tag ends, so the three have the same position and the same name
		const { nodeList } = parser.parse(document('<p><b><b><b><div>z</div></b></b></b></p>'));
		const div = nodeList.find((node): node is MLASTElement => node.type === 'starttag' && node.nodeName === 'div');
		const child = (node: MLASTElement | undefined, name: string) =>
			node?.childNodes.find((item): item is MLASTElement => item.type === 'starttag' && item.nodeName === name);
		const first = child(div, 'b');
		const second = child(first, 'b');
		const third = child(second, 'b');
		expect([first?.raw, second?.raw, third?.raw]).toStrictEqual(['', '', '']);
		expect(third?.childNodes.map(node => node.raw)).toStrictEqual(['z']);
		expect(unlisted(nodeList)).toStrictEqual([]);
	});

	test('comes after the sibling that precedes it, as in the tree of the HTML Standard', () => {
		const { nodeList } = parser.parse(
			document('<section><div><span>q</span></div></section><p><b>x<div><span><em>q</em></span>w</div>z</b></p>'),
		);
		const body = nodeList.find(
			(node): node is MLASTElement => node.type === 'starttag' && node.nodeName === 'body',
		);
		expect(body).toBeDefined();
		const children = body?.childNodes ?? [];
		// the last `p` is the one that the stray `</p>` implies: it has no source either
		const names = children
			.filter(node => node.type === 'starttag')
			.map(node => `${node.nodeName}${node.raw === '' ? ' (no source)' : ''}`);
		expect(names).toStrictEqual(['section', 'p', 'div', 'b (no source)', 'p (no source)']);
		const offsets = children.map(node => node.offset);
		expect(offsets).toStrictEqual(offsets.toSorted((a, b) => a - b));
	});

	test('is not made for a document that has nothing to make again', () => {
		const { nodeList } = parser.parse(document('<p><a href="#x">x</a></p><div><b>y</b></div>'));
		expect(unlisted(nodeList)).toStrictEqual([]);
		expect(
			nodeList.filter(node => node.type === 'starttag' && node.raw === '' && node.nodeName === 'a'),
		).toStrictEqual([]);
	});
});

/**
 * An element that is still open at `</body>` takes the white space after it: the HTML parsing algorithm inserts
 * the character into the current node, and the parser appends it to the text that the element has already, so one text
 * node spans the end tag.
 */
const OPEN_AT_END_OF_BODY = [
	'<!DOCTYPE html><html><head><title>t</title></head><body><div>x\n</body>\n</html>',
	'<!DOCTYPE html><html><head><title>t</title></head><body><p><b>x</p>\n</body>\n</html>',
	'<!DOCTYPE html><html><head><title>t</title></head><body><ul><li>x\n</body>\n</html>\n',
];

/**
 * Markup in which the parsing algorithm moves elements or makes them again by other rules than the one for a
 * misnested formatting element: foster parenting of what is in a table, and the adoption agency algorithm.
 */
const RESTRUCTURED = [
	'<table><b>x</b><tr><td>y</td></tr></table>',
	'<b><p>x</b>y</p>',
	'<a href="#1">one<a href="#2">two</a></a>',
	'<font color="red"><p>a</font><p>b</p>',
	'<table><tr><td><b>x</td></tr></table><p>z</p>',
	'<b><i><p>x</b>y</i>z</p>',
];

describe('markup that the parser moves or makes again by other rules', () => {
	test.each(RESTRUCTURED)('leaves no node in the tree that the node list lacks: %s', code => {
		expect(unlisted(parser.parse(document(code)).nodeList)).toStrictEqual([]);
	});

	test.each(RESTRUCTURED)('gives a start tag of the source to one element only: %s', code => {
		const starts = parser
			.parse(document(code))
			.nodeList.filter((node): node is MLASTElement => node.type === 'starttag' && node.raw !== '');
		const positions = starts.map(node => `${node.offset}:${node.nodeName}`);
		expect(new Set(positions).size).toBe(positions.length);
	});
});

describe('the parser after a parse', () => {
	test('does not carry what it knew of a document into the next one', () => {
		// the second document has start tags at the offsets that the first had; none of them is a repeat
		const first = parser.parse(document('<p><a href="#x"><div>x</div></a></p>')).nodeList;
		const second = parser.parse(document('<p><a href="#y">y</a></p><div><b>z</b></div>')).nodeList;
		expect(first.filter(node => node.type === 'starttag' && node.raw === '' && node.nodeName === 'a')).toHaveLength(
			1,
		);
		expect(
			second.filter(node => node.type === 'starttag' && node.raw === '' && ['a', 'b'].includes(node.nodeName)),
		).toStrictEqual([]);
	});
});

describe('the end tag of an element that has an element open inside it', () => {
	test.each(OPEN_AT_END_OF_BODY)('is paired with its start tag: %j', code => {
		const { nodeList } = parser.parse(code);
		expect(nodeList.filter(node => node.type === 'invalid')).toStrictEqual([]);
		for (const name of ['body', 'html']) {
			const start = nodeList.find(
				(node): node is MLASTElement => node.type === 'starttag' && node.nodeName === name,
			);
			const end = nodeList.find(node => node.type === 'endtag' && node.nodeName === name);
			expect(start?.pairNodeUuid).toBe(end?.uuid);
			expect(end?.raw).toBe(`</${name}>`);
		}
	});

	test.each(OPEN_AT_END_OF_BODY)('is in the node list once: %j', code => {
		const { nodeList } = parser.parse(code);
		expect(nodeList.filter(node => node.type === 'endtag' && node.nodeName === 'body')).toHaveLength(1);
		expect(nodeList.filter(node => node.type === 'endtag' && node.nodeName === 'html')).toHaveLength(1);
	});

	test.each(OPEN_AT_END_OF_BODY)('leaves no node in the tree that the node list lacks: %j', code => {
		expect(unlisted(parser.parse(code).nodeList)).toStrictEqual([]);
	});

	test('is the same as when no white space follows it', () => {
		const withSpace = parser.parse(OPEN_AT_END_OF_BODY[0] ?? '').nodeList;
		const without = parser.parse(
			'<!DOCTYPE html><html><head><title>t</title></head><body><div>x\n</body></html>',
		).nodeList;
		const kinds = (list: readonly MLASTNodeTreeItem[]) =>
			list.filter(node => node.type !== 'text').map(node => `${node.type}:${node.raw}`);
		expect(kinds(withSpace)).toStrictEqual(kinds(without));
	});
});
