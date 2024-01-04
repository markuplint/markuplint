// @ts-nocheck

import { parse } from '@markuplint/html-parser';
import { describe, test, expect } from 'vitest';

import { nodeListToDebugMaps } from './debugger.js';
import { ignoreBlock, restoreNode } from './ignore-block.js';

const tags = [
	{
		type: 'ejs-tag',
		start: /<%/,
		end: /%>/,
	},
];

describe('ignoreBlock', () => {
	test('basic', () => {
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
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('2 tags', () => {
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
					resolved: false,
				},
				{
					type: 'ejs-tag',
					index: 27,
					startTag: '<%',
					taggedCode: '= test2 ',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('without closing tag', () => {
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
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('with line break', () => {
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
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('CRLF', () => {
		const result = ignoreBlock('<div><%\r\nif () {\r\n}\r\n%></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%\r\nif () {\r\n}\r\n%></div>',
			replaced: '<div><!\n\n\n></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '\r\nif () {\r\n}\r\n',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('multiple tags', () => {
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
					resolved: false,
				},
				{
					type: 'ejs-output-value',
					index: 8,
					startTag: '<%=',
					taggedCode: ' 3 ',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-whitespace-slurping',
					index: 17,
					startTag: '<%_',
					taggedCode: ' 5 _',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-output-unescaped',
					index: 27,
					startTag: '<%-',
					taggedCode: ' 7 -',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});
});

describe('restoreNode', () => {
	test('basic', () => {
		const code = '<div attr="<% attr %>"><% content %></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		const nodeMap = nodeListToDebugMaps(restoredAst, true);
		expect(nodeMap).toStrictEqual([
			'[1:1]>[1:24](0,23)div: <div␣attr="<%␣attr␣%>">',
			'[1:6]>[1:23](5,22)attr: ␣attr="<%␣attr␣%>"',
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

	test('tag', () => {
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

	test('attr', () => {
		const code = '<div attr="<% attr %><% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('<% attr %><% attr2 %>');
	});

	test('attr', () => {
		const code = '<div attr="<% attr %> <% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('<% attr %> <% attr2 %>');
	});

	test('attr', () => {
		const code = '<div attr="<% attr %>A<% attr2 %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('<% attr %>A<% attr2 %>');
	});

	test('before space', () => {
		const code = '<div attr=" <% attr %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe(' <% attr %>');
	});

	test('after space', () => {
		const code = '<div attr=" <% attr %> "></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe(' <% attr %> ');
	});

	test('before char', () => {
		const code = '<div attr="A<% attr %>"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('A<% attr %>');
	});

	test('after char', () => {
		const code = '<div attr="A<% attr %>B"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('A<% attr %>B');
	});

	test('CRLF', () => {
		const code = '<div attr="\r\n<%\r\nattr\r\n%>\r\n"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(restoredAst[0].attributes[0].value.raw).toBe('\r\n<%\r\nattr\r\n%>\r\n');
	});

	test('Complex attributes', () => {
		const code = '<div attr="<% attr %> <% attr %>bar<% attr %><% attr %>foo"></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[1:1]>[1:61](0,60)div: <div␣attr="<!>␣<!>bar<!><!>foo">',
			'[1:61]>[1:67](60,66)div: </div>',
		]);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(nodeListToDebugMaps(restoredAst)).toStrictEqual([
			'[1:1]>[1:61](0,60)div: <div␣attr="<%␣attr␣%>␣<%␣attr␣%>bar<%␣attr␣%><%␣attr␣%>foo">',
			'[1:61]>[1:67](60,66)div: </div>',
		]);
	});

	test('unexpected parsing', () => {
		const code = '<div attr=<% attr %>></div>';
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[1:1]>[1:21](0,20)div: <div␣attr=<!>',
			'[1:21]>[1:22](20,21)#text: >',
			'[1:22]>[1:28](21,27)div: </div>',
		]);
		expect(() => restoreNode(ast.nodeList, masked)).toThrow('Parsing failed. Unsupported syntax detected');
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

	test('#1147', () => {
		const code = `
			<body>
				<label for="cheese">Do you like cheese?</label>
				<input type="checkbox" id="cheese">
				<% pp "anything" %>
			</body>
		`;
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:1]>[2:4](0,4)#text: ⏎→→→',
			'[2:4]>[2:10](4,10)body: <body>',
			'[2:10]>[3:5](10,15)#text: ⏎→→→→',
			'[3:5]>[3:25](15,35)label: <label␣for="cheese">',
			'[3:25]>[3:44](35,54)#text: Do␣you␣like␣cheese?',
			'[3:44]>[3:52](54,62)label: </label>',
			'[3:52]>[4:5](62,67)#text: ⏎→→→→',
			'[4:5]>[4:40](67,102)input: <input␣type="checkbox"␣id="cheese">',
			'[4:40]>[5:5](102,107)#text: ⏎→→→→',
			'[5:5]>[5:24](107,126)#comment: <!>',
			'[5:24]>[6:4](126,130)#text: ⏎→→→',
			'[6:4]>[6:11](130,137)body: </body>',
			'[6:11]>[7:3](137,140)#text: ⏎→→',
		]);
		expect(ast.nodeList.map(n => n.nodeName)).toStrictEqual([
			'#text',
			'body',
			'#text',
			'label',
			'#text',
			'label',
			'#text',
			'input',
			'#text',
			'#comment',
			'#text',
			'body',
			'#text',
		]);
		expect(ast.nodeList[1].childNodes.map(n => n.nodeName)).toStrictEqual([
			'#text',
			'label',
			'#text',
			'input',
			'#text',
			'#comment',
			'#text',
		]);

		const restoredAst = restoreNode(ast.nodeList, masked);
		const maps2 = nodeListToDebugMaps(restoredAst);
		expect(maps2).toStrictEqual([
			'[1:1]>[2:4](0,4)#text: ⏎→→→',
			'[2:4]>[2:10](4,10)body: <body>',
			'[2:10]>[3:5](10,15)#text: ⏎→→→→',
			'[3:5]>[3:25](15,35)label: <label␣for="cheese">',
			'[3:25]>[3:44](35,54)#text: Do␣you␣like␣cheese?',
			'[3:44]>[3:52](54,62)label: </label>',
			'[3:52]>[4:5](62,67)#text: ⏎→→→→',
			'[4:5]>[4:40](67,102)input: <input␣type="checkbox"␣id="cheese">',
			'[4:40]>[5:5](102,107)#text: ⏎→→→→',
			'[5:5]>[5:24](107,126)#ps:ejs-tag: <%␣pp␣"anything"␣%>',
			'[5:24]>[6:4](126,130)#text: ⏎→→→',
			'[6:4]>[6:11](130,137)body: </body>',
			'[6:11]>[7:3](137,140)#text: ⏎→→',
		]);
		expect(restoredAst.map(n => n.nodeName)).toStrictEqual([
			'#text',
			'body',
			'#text',
			'label',
			'#text',
			'label',
			'#text',
			'input',
			'#text',
			'#ps:ejs-tag',
			'#text',
			'body',
			'#text',
		]);
		expect(restoredAst[1].childNodes.map(n => n.nodeName)).toStrictEqual([
			'#text',
			'label',
			'#text',
			'input',
			'#text',
			'#ps:ejs-tag',
			'#text',
		]);
	});

	test('#1261', () => {
		const code = `<svg width="11" height="19" viewBox="0 0 11 19" class="ms-1">
			<use href="{% static 'images/icons-test/angle-right.svg' %}#icon"></use>
		</svg>`;
		const masked = ignoreBlock(code, tags);
		const ast = parse(masked.replaced);
		const restoredAst = restoreNode(ast.nodeList, masked);
		expect(nodeListToDebugMaps(restoredAst)).toStrictEqual([
			'[1:1]>[1:62](0,61)svg: <svg␣width="11"␣height="19"␣viewBox="0␣0␣11␣19"␣class="ms-1">',
			'[1:62]>[2:4](61,65)#text: ⏎→→→',
			'[2:4]>[2:70](65,131)use: <use␣href="{%␣static␣\'images/icons-test/angle-right.svg\'␣%}#icon">',
			'[2:70]>[2:76](131,137)use: </use>',
			'[2:76]>[3:3](137,140)#text: ⏎→→',
			'[3:3]>[3:9](140,146)svg: </svg>',
		]);
	});
});
