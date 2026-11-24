import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

import { describe, expect, test } from 'vitest';

import { parser } from './index.js';

const parse = parser.parse.bind(parser);

const invalidNodes = (nodeList: readonly MLASTNodeTreeItem[]) => nodeList.filter(node => node.type === 'invalid');

const NAMES = ['iframe', 'noembed', 'noframes', 'textarea', 'title'];

describe('the end tag in the text of an element whose content is text', () => {
	test.each(NAMES)('is a part of the text of `%s`', name => {
		const code = `<!doctype html><body><${name}></p></${name}></body>`;
		const { nodeList } = parse(code);
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		const text = nodeList.find(n => n.type === 'text' && n.raw.includes('</p>'));
		expect(text?.raw).toBe('</p>');
		expect(nodeList.find(n => n.uuid === text?.parentNodeUuid)?.nodeName).toBe(name);
	});

	test.each(NAMES)('is a part of the text of `%s` in a fragment', name => {
		const { nodeList } = parse(`<${name}></p></${name}>`, { documentMode: 'fragment' });
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('</p>');
	});

	test.each(NAMES)('is a part of the text of `%s` that is written in capitals', name => {
		const upper = name.toUpperCase();
		const { nodeList } = parse(`<!doctype html><body><${upper}></P></${upper}></body>`);
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('</P>');
	});

	test.each(NAMES)('is a part of the text of `%s` with a start tag and text around it', name => {
		const { nodeList } = parse(`<!doctype html><body><${name}>a</p><div>b</${name}></body>`);
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		expect(nodeList.some(n => n.type === 'starttag' && n.nodeName === 'div')).toBe(false);
	});

	test('is a part of the text of `plaintext`, which has no end tag and takes the rest of the source', () => {
		const { nodeList } = parse('<!doctype html><body><plaintext></p></body>');
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('</p></body>');
	});

	test('is a part of the text of `plaintext` in a fragment', () => {
		const { nodeList } = parse('<plaintext></p>', { documentMode: 'fragment' });
		expect(invalidNodes(nodeList)).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('</p>');
	});

	test('of `title` in the head is a part of the text', () => {
		const { nodeList } = parse('<!doctype html><html><head><title></div></title></head></html>');
		expect(invalidNodes(nodeList)).toStrictEqual([]);
	});

	test('of `title` in `<svg>` is still read as an end tag', () => {
		const { nodeList } = parse('<!doctype html><body><svg><title></p></title></svg></body>');
		expect(invalidNodes(nodeList).map(n => n.raw)).toStrictEqual(['</p>']);
	});

	test('of `title` in `<foreignObject>` is a part of the text, as it is an HTML element there', () => {
		const { nodeList } = parse(
			'<!doctype html><body><svg><foreignObject><title></p></title></foreignObject></svg></body>',
		);
		expect(invalidNodes(nodeList)).toStrictEqual([]);
	});

	test('of an element that holds markup is still read as an end tag', () => {
		const { nodeList } = parse('<!doctype html><body><noscript></p></noscript></body>');
		expect(invalidNodes(nodeList).map(n => n.raw)).toStrictEqual(['</p>']);
	});

	test.each(['textarea', 'title'])('keeps a character reference and markup in the text of `%s` as it is', name => {
		const { nodeList } = parse(`<!doctype html><body><${name}>a &amp; <b>b</b></${name}></body>`);
		expect(nodeList.filter(n => n.type === 'starttag' && n.nodeName === 'b')).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('a &amp; <b>b</b>');
	});

	test('keeps a comment-like text of `textarea` as text', () => {
		const { nodeList } = parse('<!doctype html><body><textarea><!-- c --></textarea></body>');
		expect(nodeList.filter(n => n.type === 'comment')).toStrictEqual([]);
		expect(nodeList.find(n => n.type === 'text')?.raw).toBe('<!-- c -->');
	});
});
