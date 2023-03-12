// @ts-nocheck

import type { MLASTElement, MLASTHTMLAttr } from '@markuplint/ml-ast';

import { parse } from '@markuplint/html-parser';

import { nodeListToDebugMaps } from './debugger';
import { ignoreBlock, restoreNode } from './ignore-block';

const tags = [
	{
		type: 'ejs-tag',
		start: /<%/,
		end: /%>/,
	},
];

describe('ignoreBlock', () => {
	it('basic', () => {
		const result = ignoreBlock('<div><%= test %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test %></div>',
			replaced: '<div><!></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test ',
					endTag: '%>',
				},
			],
			maskChar: '',
		});
	});

	it('2 tags', () => {
		const result = ignoreBlock('<div><%= test %></div><div><%= test2 %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test %></div><div><%= test2 %></div>',
			replaced: '<div><!></div><div><!></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test ',
					endTag: '%>',
				},
				{
					type: 'ejs-tag',
					index: 27,
					startTag: '<%',
					taggedCode: '= test2 ',
					endTag: '%>',
				},
			],
			maskChar: '',
		});
	});

	it('without closing tag', () => {
		const result = ignoreBlock('<div><%= test', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test',
			replaced: '<div><!>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test',
					endTag: null,
				},
			],
			maskChar: '',
		});
	});

	it('with line break', () => {
		const result = ignoreBlock('<div><% if () {\n\t\n} %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><% if () {\n\t\n} %></div>',
			replaced: '<div><!\n\n></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: ' if () {\n\t\n} ',
					endTag: '%>',
				},
			],
			maskChar: '',
		});
	});

	it('multiple tags', () => {
		const result = ignoreBlock('<% 1 %>2<%= 3 %>4<%_ 5 _%>6<%- 7 -%>8<%% 9 %>', [
			{
				type: 'ejs-whitespace-slurping',
				start: /<%_/,
				end: /%>/,
			},
			{
				type: 'ejs-output-value',
				start: /<%=/,
				end: /%>/,
			},
			{
				type: 'ejs-output-unescaped',
				start: /<%-/,
				end: /%>/,
			},
			{
				type: 'ejs-comment',
				start: /<%#/,
				end: /%>/,
			},
			{
				type: 'ejs-scriptlet',
				start: /<%(?!%)/,
				end: /%>/,
			},
		]);

		expect(result).toStrictEqual({
			source: '<% 1 %>2<%= 3 %>4<%_ 5 _%>6<%- 7 -%>8<%% 9 %>',
			replaced: '<!>2<!>4<!>6<!>8<%% 9 %>',
			stack: [
				{
					type: 'ejs-scriptlet',
					index: 0,
					startTag: '<%',
					taggedCode: ' 1 ',
					endTag: '%>',
				},
				{
					type: 'ejs-output-value',
					index: 8,
					startTag: '<%=',
					taggedCode: ' 3 ',
					endTag: '%>',
				},
				{
					type: 'ejs-whitespace-slurping',
					index: 17,
					startTag: '<%_',
					taggedCode: ' 5 _',
					endTag: '%>',
				},
				{
					type: 'ejs-output-unescaped',
					index: 27,
					startTag: '<%-',
					taggedCode: ' 7 -',
					endTag: '%>',
				},
			],
			maskChar: '',
		});
	});
});

describe('restoreNode', () => {
	it('basic', () => {
		const code = '<div attr="<% attr %>"><% content %></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		const nodeMap = nodeListToDebugMaps(restoredAst, true);
		// TODO: Remove the masks from Element.raw and Attribute.raw
		expect(nodeMap).toStrictEqual([
			'[1:1]>[1:24](0,23)div: <div␣attr="">',
			'[1:6]>[1:23](5,22)attr: attr=""',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:10](5,9)name: attr',
			'  [1:10]>[1:10](9,9)bE: ',
			'  [1:10]>[1:11](9,10)equal: =',
			'  [1:11]>[1:11](10,10)aE: ',
			'  [1:11]>[1:12](10,11)sQ: "',
			'  [1:12]>[1:22](11,21)value: <%␣attr␣%>',
			'  [1:22]>[1:23](21,22)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:24]>[1:37](23,36)#ps:ejs-tag: <%␣content␣%>',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});

	it('tag', () => {
		const code = '<title><% content %></title>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		const nodeMap = nodeListToDebugMaps(restoredAst);
		expect(nodeMap).toStrictEqual([
			'[1:1]>[1:8](0,7)title: <title>',
			'[1:8]>[1:21](7,20)#ps:ejs-tag: <%␣content␣%>',
			'[1:21]>[1:29](20,28)title: </title>',
		]);
	});

	it('attr', () => {
		const code = '<div attr="<% attr %><% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(
			'<% attr %><% attr2 %>',
		);
	});

	it('attr', () => {
		const code = '<div attr="<% attr %> <% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(
			'<% attr %> <% attr2 %>',
		);
	});

	it('attr', () => {
		const code = '<div attr="<% attr %>A<% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(
			'<% attr %>A<% attr2 %>',
		);
	});

	it('before space', () => {
		const code = '<div attr=" <% attr %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(' <% attr %>');
	});

	it('after space', () => {
		const code = '<div attr=" <% attr %> "></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(' <% attr %> ');
	});

	it('before char', () => {
		const code = '<div attr="A<% attr %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe('A<% attr %>');
	});

	it('after char', () => {
		const code = '<div attr="A<% attr %>B"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(((restoredAst[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe('A<% attr %>B');
	});

	it('unexpected parsing', () => {
		const code = '<div attr="<% attr %> "></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst).toStrictEqual([]);
	});
});

describe('Issues', () => {
	test('#607', () => {
		const code = '<div><% %><img/></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[2].parentNode?.uuid).toBe(restoredAst[0].uuid);
		expect(restoredAst[2].prevNode?.uuid).toBe(restoredAst[1].uuid);
	});
});
