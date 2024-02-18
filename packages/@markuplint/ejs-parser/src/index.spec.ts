// @ts-nocheck

import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Node list', () => {
	test('a code', () => {
		const doc = parse('<div>abc<%= efg %>hij</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:ejs-output-value: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:28](21,27)div: </div>',
		]);
	});

	test('two codes', () => {
		const doc = parse('<div>abc<%= efg %>hij<%= klm %></div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:ejs-output-value: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:ejs-output-value: <%=␣klm␣%>',
			'[1:32]>[1:38](31,37)div: </div>',
		]);
	});

	test('two codes2', () => {
		const doc = parse('<div>abc<%= efg %>hij<%= klm %>nop</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:ejs-output-value: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:ejs-output-value: <%=␣klm␣%>',
			'[1:32]>[1:35](31,34)#text: nop',
			'[1:35]>[1:41](34,40)div: </div>',
		]);
	});

	test('two codes2 on bare', () => {
		const doc = parse('abc<%= efg %>hij<%= klm %>nop');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:4](0,3)#text: abc',
			'[1:4]>[1:14](3,13)#ps:ejs-output-value: <%=␣efg␣%>',
			'[1:14]>[1:17](13,16)#text: hij',
			'[1:17]>[1:27](16,26)#ps:ejs-output-value: <%=␣klm␣%>',
			'[1:27]>[1:30](26,29)#text: nop',
		]);
	});

	test('nest block', () => {
		const doc = parse('<% if (foo) { %>abcdef<% } %>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:17](0,16)#ps:ejs-scriptlet: <%␣if␣(foo)␣{␣%>',
			'[1:17]>[1:23](16,22)#text: abcdef',
			'[1:23]>[1:30](22,29)#ps:ejs-scriptlet: <%␣}␣%>',
		]);
	});

	test('nest block', () => {
		const doc = parse('<% if (foo) { %>abc<%= foo %>def<% } %>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:17](0,16)#ps:ejs-scriptlet: <%␣if␣(foo)␣{␣%>',
			'[1:17]>[1:20](16,19)#text: abc',
			'[1:20]>[1:30](19,29)#ps:ejs-output-value: <%=␣foo␣%>',
			'[1:30]>[1:33](29,32)#text: def',
			'[1:33]>[1:40](32,39)#ps:ejs-scriptlet: <%␣}␣%>',
		]);
	});

	test('nest block', () => {
		const doc = parse(`<% if (user) { %>
<div><%= user.name %></div>
<% } %>
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:18](0,17)#ps:ejs-scriptlet: <%␣if␣(user)␣{␣%>',
			'[1:18]>[2:1](17,18)#text: ⏎',
			'[2:1]>[2:6](18,23)div: <div>',
			'[2:6]>[2:22](23,39)#ps:ejs-output-value: <%=␣user.name␣%>',
			'[2:22]>[2:28](39,45)div: </div>',
			'[2:28]>[3:1](45,46)#text: ⏎',
			'[3:1]>[3:8](46,53)#ps:ejs-scriptlet: <%␣}␣%>',
			'[3:8]>[4:1](53,54)#text: ⏎',
		]);

		const el = doc.nodeList[3];
		const el2 = doc.nodeList[3].parentNode.childNodes[0];
		expect(el.nodeName).toBe(el2.nodeName);
		expect(el.uuid).toBe(el2.uuid);
	});

	test('Full HTML', () => {
		const doc = parse(`<!DOCTYPE html>
<html lang="en">
	<head>
		<%- include('path/to') _%>
		<meta />
	</head>
	<body></body>
</html>
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:16](0,15)#doctype: <!DOCTYPE␣html>',
			'[1:16]>[2:1](15,16)#text: ⏎',
			'[2:1]>[2:17](16,32)html: <html␣lang="en">',
			'[2:17]>[3:2](32,34)#text: ⏎→',
			'[3:2]>[3:8](34,40)head: <head>',
			'[3:8]>[4:3](40,43)#text: ⏎→→',
			"[4:3]>[4:29](43,69)#ps:ejs-output-unescaped: <%-␣include('path/to')␣_%>",
			'[4:29]>[5:3](69,72)#text: ⏎→→',
			'[5:3]>[5:11](72,80)meta: <meta␣/>',
			'[5:11]>[6:2](80,82)#text: ⏎→',
			'[6:2]>[6:9](82,89)head: </head>',
			'[6:9]>[7:2](89,91)#text: ⏎→',
			'[7:2]>[7:8](91,97)body: <body>',
			'[7:8]>[7:15](97,104)body: </body>',
			'[7:15]>[8:1](104,105)#text: ⏎',
			'[8:1]>[8:8](105,112)html: </html>',
			'[8:8]>[9:1](112,113)#text: ⏎',
		]);
	});

	test('mutable text node', () => {
		const doc = parse('<title><%= title %></title>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:8](0,7)title: <title>',
			'[1:8]>[1:20](7,19)#ps:ejs-output-value: <%=␣title␣%>',
			'[1:20]>[1:28](19,27)title: </title>',
		]);
	});
});

describe('Tags', () => {
	test('ejs-whitespace-slurping', () => {
		expect(parse('<%_ any _%>').nodeList[0].nodeName).toBe('#ps:ejs-whitespace-slurping');
	});

	test('ejs-output-value', () => {
		expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:ejs-output-value');
	});

	test('ejs-output-unescaped', () => {
		expect(parse('<%- any -%>').nodeList[0].nodeName).toBe('#ps:ejs-output-unescaped');
	});

	test('ejs-comment', () => {
		expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:ejs-comment');
	});

	test('ejs-scriptlet', () => {
		expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:ejs-scriptlet');
	});

	test('text node', () => {
		expect(parse('<%% any %>').nodeList[0].nodeName).toBe('#text');
	});
});

describe('Issues', () => {
	test('#607', () => {
		const ast = parse('<% %><div></div>');
		expect(ast.nodeList.length).toBe(3);
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)#ps:ejs-scriptlet: <%␣%>',
			'[1:6]>[1:11](5,10)div: <div>',
			'[1:11]>[1:17](10,16)div: </div>',
		]);
	});

	test('#1476', () => {
		const ast = parse(`<!DOCTYPE html>
<html lang="en">
	<head>
		<title>title <%= title %> title</title>
	</head>
	<body>
		<h1>heading <%= heading %> heading</h1> <!-- ← no errors -->
		<p>paragraph <%= paragraph %> paragraph</p> <!-- ← no errors -->
	</body>
</html>`);
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[1:1]>[1:16](0,15)#doctype: <!DOCTYPE␣html>',
			'[1:16]>[2:1](15,16)#text: ⏎',
			'[2:1]>[2:17](16,32)html: <html␣lang="en">',
			'[2:17]>[3:2](32,34)#text: ⏎→',
			'[3:2]>[3:8](34,40)head: <head>',
			'[3:8]>[4:3](40,43)#text: ⏎→→',
			'[4:3]>[4:10](43,50)title: <title>',
			'[4:10]>[4:16](50,56)#text: title␣',
			'[4:16]>[4:28](56,68)#ps:ejs-output-value: <%=␣title␣%>',
			'[4:28]>[4:34](68,74)#text: ␣title',
			'[4:34]>[4:42](74,82)title: </title>',
			'[4:42]>[5:2](82,84)#text: ⏎→',
			'[5:2]>[5:9](84,91)head: </head>',
			'[5:9]>[6:2](91,93)#text: ⏎→',
			'[6:2]>[6:8](93,99)body: <body>',
			'[6:8]>[7:3](99,102)#text: ⏎→→',
			'[7:3]>[7:7](102,106)h1: <h1>',
			'[7:7]>[7:15](106,114)#text: heading␣',
			'[7:15]>[7:29](114,128)#ps:ejs-output-value: <%=␣heading␣%>',
			'[7:29]>[7:37](128,136)#text: ␣heading',
			'[7:37]>[7:42](136,141)h1: </h1>',
			'[7:42]>[7:43](141,142)#text: ␣',
			'[7:43]>[7:63](142,162)#comment: <!--␣←␣no␣errors␣-->',
			'[7:63]>[8:3](162,165)#text: ⏎→→',
			'[8:3]>[8:6](165,168)p: <p>',
			'[8:6]>[8:16](168,178)#text: paragraph␣',
			'[8:16]>[8:32](178,194)#ps:ejs-output-value: <%=␣paragraph␣%>',
			'[8:32]>[8:42](194,204)#text: ␣paragraph',
			'[8:42]>[8:46](204,208)p: </p>',
			'[8:46]>[8:47](208,209)#text: ␣',
			'[8:47]>[8:67](209,229)#comment: <!--␣←␣no␣errors␣-->',
			'[8:67]>[9:2](229,231)#text: ⏎→',
			'[9:2]>[9:9](231,238)body: </body>',
			'[9:9]>[10:1](238,239)#text: ⏎',
			'[10:1]>[10:8](239,246)html: </html>',
		]);
	});
});
