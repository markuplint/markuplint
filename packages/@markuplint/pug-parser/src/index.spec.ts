// @ts-nocheck

import { nodeListToDebugMaps, nodeTreeDebugView } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('parser', () => {
	test('syntax error', () => {
		expect(() => {
			parse('div(');
		}).toThrow('The end of the string reached with no closing bracket ) found.');
	});

	test('empty code', () => {
		const doc = parse('');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	test('text only', () => {
		const doc = parse('| text');
		expect(doc.nodeList[0].nodeName).toBe('#text');
		expect(doc.nodeList[0].raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	test('element', () => {
		const doc = parse('div');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe('div');
		expect(doc.nodeList.length).toBe(1);
	});

	test('HTML in Pug', () => {
		const doc = parse(
			`div
	<span data-hoge hoge>Text</span>
	<span data-hoge2 hoge2>Text2</span>`,
		);
		// console.log(doc.nodeList);
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);

		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[1].nodeName).toBe('span');
		expect(doc.nodeList[1].attributes[0].name.raw).toBe('data-hoge');
		expect(doc.nodeList[1].attributes[1].name.raw).toBe('hoge');
		expect(doc.nodeList[0].childNodes[0].nodeName).toBe('span');
	});

	test('standard code', () => {
		const doc = parse(`doctype html
html
	head
		meta(charset='UTF-8')
		meta(name="viewport" content='width=device-width, initial-scale=1.0')
		meta(http-equiv='X-UA-Compatible' content='ie=edge')
		title Document
	body
		script.
			const i = 0;
		// html-comment
		div
			| text&amp;div
		table
			tr
			th header
			td cell
		table
			tbody
			tr
				th header
				td cell
		img(src=path/to)
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList[doc.nodeList.length - 1]);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:13](0,12)#doctype: doctype␣html',
			'[2:1]>[2:5](13,17)html: html',
			'[3:2]>[3:6](19,23)head: head',
			"[4:3]>[4:24](26,47)meta: meta(charset='UTF-8')",
			'[5:3]>[5:72](50,119)meta: meta(name="viewport"␣content=\'width=device-width,␣initial-scale=1.0\')',
			"[6:3]>[6:55](122,174)meta: meta(http-equiv='X-UA-Compatible'␣content='ie=edge')",
			'[7:3]>[7:8](177,182)title: title',
			'[7:9]>[7:17](183,191)#text: Document',
			'[8:2]>[8:6](193,197)body: body',
			'[9:3]>[9:9](200,206)script: script',
			'[11:3]>[11:18](226,241)#comment: //␣html-comment',
			'[12:3]>[12:6](244,247)div: div',
			'[13:6]>[13:18](253,265)#text: text&amp;div',
			'[14:3]>[14:8](268,273)table: table',
			'[15:4]>[15:6](277,279)tr: tr',
			'[16:4]>[16:6](283,285)th: th',
			'[16:7]>[16:13](286,292)#text: header',
			'[17:4]>[17:6](296,298)td: td',
			'[17:7]>[17:11](299,303)#text: cell',
			'[18:3]>[18:8](306,311)table: table',
			'[19:4]>[19:9](315,320)tbody: tbody',
			'[20:4]>[20:6](324,326)tr: tr',
			'[21:5]>[21:7](331,333)th: th',
			'[21:8]>[21:14](334,340)#text: header',
			'[22:5]>[22:7](345,347)td: td',
			'[22:8]>[22:12](348,352)#text: cell',
			'[23:3]>[23:19](355,371)img: img(src=path/to)',
		]);
	});

	test('minimum code', () => {
		const doc = parse(`html
	head
		title Title
	body
		h1 Title
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)html: html',
			'[2:2]>[2:6](6,10)head: head',
			'[3:3]>[3:8](13,18)title: title',
			'[3:9]>[3:14](19,24)#text: Title',
			'[4:2]>[4:6](26,30)body: body',
			'[5:3]>[5:5](33,35)h1: h1',
			'[5:6]>[5:11](36,41)#text: Title',
		]);
	});

	test('CRLF', () => {
		const doc = parse(
			`html
	head
		title Title
	body
		h1 Title
`.replaceAll('\n', '\r\n'),
		);

		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:5](0,4)html: html',
			'[2:2]>[2:6](7,11)head: head',
			'[3:3]>[3:8](15,20)title: title',
			'[3:9]>[3:14](21,26)#text: Title',
			'[4:2]>[4:6](29,33)body: body',
			'[5:3]>[5:5](37,39)h1: h1',
			'[5:6]>[5:11](40,45)#text: Title',
		]);
	});

	test('deep structure code', () => {
		const doc = parse(`div(data-depth=0)
		div(data-depth=1)
			div(data-depth=2)
				div(data-depth=3)
					div(data-depth=4)
						div(data-depth=5)
							div(data-depth=6)
								div(data-depth=7)
									div(data-depth=8)
										div(data-depth=9)
											div(data-depth=10)
												div(data-depth=11)
													div(data-depth=12)
														div(data-depth=13)
															div(data-depth=14)
																div(data-depth=15)
																	div(data-depth=16)
																		div(data-depth=17)
																			div(data-depth=18)
																				div(data-depth=19)
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:18](0,17)div: div(data-depth=0)',
			'[2:3]>[2:20](20,37)div: div(data-depth=1)',
			'[3:4]>[3:21](41,58)div: div(data-depth=2)',
			'[4:5]>[4:22](63,80)div: div(data-depth=3)',
			'[5:6]>[5:23](86,103)div: div(data-depth=4)',
			'[6:7]>[6:24](110,127)div: div(data-depth=5)',
			'[7:8]>[7:25](135,152)div: div(data-depth=6)',
			'[8:9]>[8:26](161,178)div: div(data-depth=7)',
			'[9:10]>[9:27](188,205)div: div(data-depth=8)',
			'[10:11]>[10:28](216,233)div: div(data-depth=9)',
			'[11:12]>[11:30](245,263)div: div(data-depth=10)',
			'[12:13]>[12:31](276,294)div: div(data-depth=11)',
			'[13:14]>[13:32](308,326)div: div(data-depth=12)',
			'[14:15]>[14:33](341,359)div: div(data-depth=13)',
			'[15:16]>[15:34](375,393)div: div(data-depth=14)',
			'[16:17]>[16:35](410,428)div: div(data-depth=15)',
			'[17:18]>[17:36](446,464)div: div(data-depth=16)',
			'[18:19]>[18:37](483,501)div: div(data-depth=17)',
			'[19:20]>[19:38](521,539)div: div(data-depth=18)',
			'[20:21]>[20:39](560,578)div: div(data-depth=19)',
		]);
	});

	test('code in code', () => {
		const doc = parse(`ul
	each i in obj
		li= i
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:3](0,2)ul: ul',
			'[2:2]>[2:15](4,17)#ps:Each (each): each␣i␣in␣obj',
			'[3:3]>[3:5](20,22)li: li',
			'[3:5]>[3:8](22,25)#ps:Code: =␣i',
		]);
	});

	test('code in code', () => {
		const doc = parse(`if bool
	| 1
else if bool2
	| 2
else
	| 3
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:8](0,7)#ps:Conditional: if␣bool',
			'[2:4]>[2:5](11,12)#text: 1',
			'[3:1]>[3:14](13,26)#ps:Conditional: else␣if␣bool2',
			'[4:4]>[4:5](30,31)#text: 2',
			'[5:1]>[5:5](32,36)#ps:Conditional: else',
			'[6:4]>[6:5](40,41)#text: 3',
		]);
	});

	test('HTML in Pug', () => {
		const doc = parse(
			`section
	div
		<span>
			<img src="path/to">
		</span>
			`,
		);
		// console.log(doc.nodeList);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[1:8](0,7)section: section',
			'[2:2]>[2:5](9,12)div: div',
			'[3:3]>[3:9](15,21)span: <span>',
			'[3:9]>[4:4](21,25)#text: ⏎→→→',
			'[4:4]>[4:23](25,44)img: <img␣src="path/to">',
			'[4:23]>[5:3](44,47)#text: ⏎→→',
			'[5:3]>[5:10](47,54)span: </span>',
		]);
	});

	test('tag interpolation (Issue #58)', () => {
		const doc = parse(`p
	| lorem #[span ipsum]`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:2](0,1)p: p',
			'[2:4]>[2:10](5,11)#text: lorem␣',
			'[2:12]>[2:16](13,17)span: span',
			'[2:17]>[2:22](18,23)#text: ipsum',
		]);
	});

	test('block-in-tag div', () => {
		const doc = parse(`div.
	<span>text</span>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:8](6,12)span: <span>',
			'[2:8]>[2:12](12,16)#text: text',
			'[2:12]>[2:19](16,23)span: </span>',
		]);
	});

	test('block-in-tag div 2', () => {
		const doc = parse(`.root.
	<div>
		text
	</div>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: .root',
			'[1:7]>[2:2](6,8)#text: ⏎→',
			'[2:2]>[2:7](8,13)div: <div>',
			'[2:7]>[4:2](13,22)#text: ⏎→→text⏎→',
			'[4:2]>[4:8](22,28)div: </div>',
		]);
	});

	test('block-in-tag div 3', () => {
		const doc = parse(`.root.
	<div>
		<img />
	</div>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: .root',
			'[1:7]>[2:2](6,8)#text: ⏎→',
			'[2:2]>[2:7](8,13)div: <div>',
			'[2:7]>[3:3](13,16)#text: ⏎→→',
			'[3:3]>[3:10](16,23)img: <img␣/>',
			'[3:10]>[4:2](23,25)#text: ⏎→',
			'[4:2]>[4:8](25,31)div: </div>',
		]);
	});

	test('block-in-tag script', () => {
		const doc = parse(`script.
	const $span = '<span>text</span>';`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual(['[1:1]>[1:7](0,6)script: script']);
	});

	test('block-in-tag script2', () => {
		const doc = parse(`div.
	<script> var a = "<aaaa>"; </script>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:10](6,14)script: <script>',
			'[2:29]>[2:38](33,42)script: </script>',
		]);
	});

	test('block-in-tag attr', () => {
		const doc = parse(`div.
	<input invalid-attr/>
	<input invalid-attr/>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:4](0,3)div: div',
			'[1:5]>[2:2](4,6)#text: ⏎→',
			'[2:2]>[2:23](6,27)input: <input␣invalid-attr/>',
			'[2:23]>[3:2](27,29)#text: ⏎→',
			'[3:2]>[3:23](29,50)input: <input␣invalid-attr/>',
		]);
		const input1 = doc.nodeList[2];
		const input2 = doc.nodeList[4];
		expect(input1.offset).toBe(6);
		expect(input1.line).toBe(2);
		expect(input1.col).toBe(2);
		expect(input1.attributes[0].line).toBe(2);
		expect(input1.attributes[0].col).toBe(9);
		expect(input2.offset).toBe(29);
		expect(input2.line).toBe(3);
		expect(input2.col).toBe(2);
		expect(input2.attributes[0].line).toBe(3);
		expect(input2.attributes[0].col).toBe(9);
	});

	test('block-in-tag attr2', () => {
		const doc = parse(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\ndiv.\n\t<input invalid-attr/>\n\t<input invalid-attr invalid-attr2/>',
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[21:1]>[21:4](20,23)div: div',
			'[21:5]>[22:2](24,26)#text: ⏎→',
			'[22:2]>[22:23](26,47)input: <input␣invalid-attr/>',
			'[22:23]>[23:2](47,49)#text: ⏎→',
			'[23:2]>[23:37](49,84)input: <input␣invalid-attr␣invalid-attr2/>',
		]);
		const input1 = doc.nodeList[2];
		const input2 = doc.nodeList[4];
		const attr1 = input1.attributes[0];
		const attr2 = input2.attributes[0];
		const attr3 = input2.attributes[1];
		expect(attr1.line).toBe(22);
		expect(attr1.col).toBe(9);
		expect(attr1.name.line).toBe(22);
		expect(attr1.name.col).toBe(9);
		expect(attr2.line).toBe(23);
		expect(attr2.col).toBe(9);
		expect(attr2.name.line).toBe(23);
		expect(attr2.name.col).toBe(9);
		expect(attr3.line).toBe(23);
		expect(attr3.col).toBe(22);
		expect(attr3.name.line).toBe(23);
		expect(attr3.name.col).toBe(22);
	});

	test('add space to below', () => {
		const doc = parse(`   \n           \n   \nhtml
	head
		title Title
	body
		h1 Title
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[4:1]>[4:5](20,24)html: html',
			'[5:2]>[5:6](26,30)head: head',
			'[6:3]>[6:8](33,38)title: title',
			'[6:9]>[6:14](39,44)#text: Title',
			'[7:2]>[7:6](46,50)body: body',
			'[8:3]>[8:5](53,55)h1: h1',
			'[8:6]>[8:11](56,61)#text: Title',
		]);
	});

	test('with frontmatter', () => {
		const doc = parse(
			`---
prop: value
---
html
	head
		title Title
	body
		h1 Title
`,
			{ ignoreFrontMatter: true },
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(doc.nodeList);
		// console.log(map);
		expect(map).toStrictEqual([
			'[1:1]>[4:1](0,20)#ps:front-matter: ---⏎prop:␣value⏎---⏎',
			'[4:1]>[4:5](20,24)html: html',
			'[5:2]>[5:6](26,30)head: head',
			'[6:3]>[6:8](33,38)title: title',
			'[6:9]>[6:14](39,44)#text: Title',
			'[7:2]>[7:6](46,50)body: body',
			'[8:3]>[8:5](53,55)h1: h1',
			'[8:6]>[8:11](56,61)#text: Title',
		]);
	});

	test('namespace', () => {
		const doc = parse('div: svg: text');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].namespace).toBe('http://www.w3.org/1999/xhtml');
		expect(doc.nodeList[1].nodeName).toBe('svg');
		expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].nodeName).toBe('text');
		expect(doc.nodeList[2].namespace).toBe('http://www.w3.org/2000/svg');
	});
});

describe('Attributes', () => {
	// https://pugjs.org/language/attributes.html
	test('Standard', () => {
		const doc = parse(
			`
a(href='//google.com') Google
a(class='button' href='//google.com') Google
a(class='button', href='//google.com') Google
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			"[2:1]>[2:23](1,23)a: a(href='//google.com')",
			"[2:3]>[2:22](3,22)href: href='//google.com'",
			'  [2:3]>[2:3](3,3)bN: ',
			'  [2:3]>[2:7](3,7)name: href',
			'  [2:7]>[2:7](7,7)bE: ',
			'  [2:7]>[2:8](7,8)equal: =',
			'  [2:8]>[2:8](8,8)aE: ',
			"  [2:8]>[2:9](8,9)sQ: '",
			'  [2:9]>[2:21](9,21)value: //google.com',
			"  [2:21]>[2:22](21,22)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[2:24]>[2:30](24,30)#text: Google',
			"[3:1]>[3:38](31,68)a: a(class='button'␣href='//google.com')",
			"[3:3]>[3:17](33,47)class: class='button'",
			'  [3:3]>[3:3](33,33)bN: ',
			'  [3:3]>[3:8](33,38)name: class',
			'  [3:8]>[3:8](38,38)bE: ',
			'  [3:8]>[3:9](38,39)equal: =',
			'  [3:9]>[3:9](39,39)aE: ',
			"  [3:9]>[3:10](39,40)sQ: '",
			'  [3:10]>[3:16](40,46)value: button',
			"  [3:16]>[3:17](46,47)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[3:18]>[3:37](48,67)href: href='//google.com'",
			'  [3:18]>[3:18](48,48)bN: ',
			'  [3:18]>[3:22](48,52)name: href',
			'  [3:22]>[3:22](52,52)bE: ',
			'  [3:22]>[3:23](52,53)equal: =',
			'  [3:23]>[3:23](53,53)aE: ',
			"  [3:23]>[3:24](53,54)sQ: '",
			'  [3:24]>[3:36](54,66)value: //google.com',
			"  [3:36]>[3:37](66,67)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[3:39]>[3:45](69,75)#text: Google',
			"[4:1]>[4:39](76,114)a: a(class='button',␣href='//google.com')",
			"[4:3]>[4:17](78,92)class: class='button'",
			'  [4:3]>[4:3](78,78)bN: ',
			'  [4:3]>[4:8](78,83)name: class',
			'  [4:8]>[4:8](83,83)bE: ',
			'  [4:8]>[4:9](83,84)equal: =',
			'  [4:9]>[4:9](84,84)aE: ',
			"  [4:9]>[4:10](84,85)sQ: '",
			'  [4:10]>[4:16](85,91)value: button',
			"  [4:16]>[4:17](91,92)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[4:19]>[4:38](94,113)href: href='//google.com'",
			'  [4:19]>[4:19](94,94)bN: ',
			'  [4:19]>[4:23](94,98)name: href',
			'  [4:23]>[4:23](98,98)bE: ',
			'  [4:23]>[4:24](98,99)equal: =',
			'  [4:24]>[4:24](99,99)aE: ',
			"  [4:24]>[4:25](99,100)sQ: '",
			'  [4:25]>[4:37](100,112)value: //google.com',
			"  [4:37]>[4:38](112,113)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[4:40]>[4:46](115,121)#text: Google',
		]);
	});

	test('Normal JavaScript expressions', () => {
		const doc = parse(
			`
- var authenticated = true
body(class=authenticated ? 'authed' : 'anon')
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:1](1,1)#ps:Code: ',
			"[3:1]>[3:46](28,73)body: body(class=authenticated␣?␣'authed'␣:␣'anon')",
			"[3:6]>[3:45](33,72)class: class=authenticated␣?␣'authed'␣:␣'anon'",
			'  [3:6]>[3:6](33,33)bN: ',
			'  [3:6]>[3:11](33,38)name: class',
			'  [3:11]>[3:11](38,38)bE: ',
			'  [3:11]>[3:12](38,39)equal: =',
			'  [3:12]>[3:12](39,39)aE: ',
			'  [3:12]>[3:12](39,39)sQ: ',
			"  [3:12]>[3:45](39,72)value: authenticated␣?␣'authed'␣:␣'anon'",
			'  [3:45]>[3:45](72,72)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
		]);
	});

	// https://pugjs.org/language/attributes.html#multiline-attributes
	test('Multiline Attributes', () => {
		const doc = parse(
			`
input(
  type='checkbox'
  name='agreement'
  checked
)
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			"[2:1]>[6:2](1,56)input: input(⏎␣␣type='checkbox'⏎␣␣name='agreement'⏎␣␣checked⏎)",
			"[3:3]>[3:18](10,25)type: type='checkbox'",
			'  [3:3]>[3:3](10,10)bN: ',
			'  [3:3]>[3:7](10,14)name: type',
			'  [3:7]>[3:7](14,14)bE: ',
			'  [3:7]>[3:8](14,15)equal: =',
			'  [3:8]>[3:8](15,15)aE: ',
			"  [3:8]>[3:9](15,16)sQ: '",
			'  [3:9]>[3:17](16,24)value: checkbox',
			"  [3:17]>[3:18](24,25)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[4:3]>[4:19](28,44)name: name='agreement'",
			'  [4:3]>[4:3](28,28)bN: ',
			'  [4:3]>[4:7](28,32)name: name',
			'  [4:7]>[4:7](32,32)bE: ',
			'  [4:7]>[4:8](32,33)equal: =',
			'  [4:8]>[4:8](33,33)aE: ',
			"  [4:8]>[4:9](33,34)sQ: '",
			'  [4:9]>[4:18](34,43)value: agreement',
			"  [4:18]>[4:19](43,44)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[5:3]>[5:10](47,54)checked: checked',
			'  [5:3]>[5:3](47,47)bN: ',
			'  [5:3]>[5:10](47,54)name: checked',
			'  [5:10]>[5:10](54,54)bE: ',
			'  [5:10]>[5:10](54,54)equal: ',
			'  [5:10]>[5:10](54,54)aE: ',
			'  [5:10]>[5:10](54,54)sQ: ',
			'  [5:10]>[5:10](54,54)value: ',
			'  [5:10]>[5:10](54,54)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
		]);
	});

	test('Multiline Attributes 2', () => {
		const doc = parse(
			`
input(data-json=\`
  {
    "very-long": "piece of ",
    "data": true
  }
\`)
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[7:3](1,76)input: input(data-json=`⏎␣␣{⏎␣␣␣␣"very-long":␣"piece␣of␣",⏎␣␣␣␣"data":␣true⏎␣␣}⏎`)',
			'[2:7]>[7:2](7,75)data-json: data-json=`⏎␣␣{⏎␣␣␣␣"very-long":␣"piece␣of␣",⏎␣␣␣␣"data":␣true⏎␣␣}⏎`',
			'  [2:7]>[2:7](7,7)bN: ',
			'  [2:7]>[2:16](7,16)name: data-json',
			'  [2:16]>[2:16](16,16)bE: ',
			'  [2:16]>[2:17](16,17)equal: =',
			'  [2:17]>[2:17](17,17)aE: ',
			'  [2:17]>[2:17](17,17)sQ: ',
			'  [2:17]>[7:2](17,75)value: `⏎␣␣{⏎␣␣␣␣"very-long":␣"piece␣of␣",⏎␣␣␣␣"data":␣true⏎␣␣}⏎`',
			'  [7:2]>[7:2](75,75)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
		]);
	});

	// https://pugjs.org/language/attributes.html#quoted-attributes
	test('Quoted Attributes (Failed to parse)', () => {
		expect(() => {
			parse(
				`
//- In this case, \`(click)\` is treated as a
//- function call instead of a attribute name,
//- resulting in the unusual error.
div(class='div-class' (click)='play()')
				`,
			);
		}).toThrow('Syntax Error: Assigning to rvalue'); // cspell:disable-line
	});

	test('Quoted Attributes', () => {
		const doc = parse(
			`
div(class='div-class', (click)='play()')
div(class='div-class' '(click)'='play()')
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			"[2:1]>[2:41](1,41)div: div(class='div-class',␣(click)='play()')",
			"[2:5]>[2:22](5,22)class: class='div-class'",
			'  [2:5]>[2:5](5,5)bN: ',
			'  [2:5]>[2:10](5,10)name: class',
			'  [2:10]>[2:10](10,10)bE: ',
			'  [2:10]>[2:11](10,11)equal: =',
			'  [2:11]>[2:11](11,11)aE: ',
			"  [2:11]>[2:12](11,12)sQ: '",
			'  [2:12]>[2:21](12,21)value: div-class',
			"  [2:21]>[2:22](21,22)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[2:24]>[2:40](24,40)(click): (click)='play()'",
			'  [2:24]>[2:24](24,24)bN: ',
			'  [2:24]>[2:31](24,31)name: (click)',
			'  [2:31]>[2:31](31,31)bE: ',
			'  [2:31]>[2:32](31,32)equal: =',
			'  [2:32]>[2:32](32,32)aE: ',
			"  [2:32]>[2:33](32,33)sQ: '",
			'  [2:33]>[2:39](33,39)value: play()',
			"  [2:39]>[2:40](39,40)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[3:1]>[3:42](42,83)div: div(class='div-class'␣'(click)'='play()')",
			"[3:5]>[3:22](46,63)class: class='div-class'",
			'  [3:5]>[3:5](46,46)bN: ',
			'  [3:5]>[3:10](46,51)name: class',
			'  [3:10]>[3:10](51,51)bE: ',
			'  [3:10]>[3:11](51,52)equal: =',
			'  [3:11]>[3:11](52,52)aE: ',
			"  [3:11]>[3:12](52,53)sQ: '",
			'  [3:12]>[3:21](53,62)value: div-class',
			"  [3:21]>[3:22](62,63)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[3:23]>[3:41](64,82)(click): '(click)'='play()'",
			'  [3:23]>[3:23](64,64)bN: ',
			"  [3:23]>[3:32](64,73)name: '(click)'",
			'  [3:32]>[3:32](73,73)bE: ',
			'  [3:32]>[3:33](73,74)equal: =',
			'  [3:33]>[3:33](74,74)aE: ',
			"  [3:33]>[3:34](74,75)sQ: '",
			'  [3:34]>[3:40](75,81)value: play()',
			"  [3:40]>[3:41](81,82)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: (click)',
		]);
	});

	test('Attribute Interpolation (Simply JavaScript)', () => {
		const doc = parse(
			`
- var url = 'pug-test.html';
a(href='/' + url) Link
- url = 'https://example.com/'
a(href=url) Another link
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:1](1,1)#ps:Code: ',
			"[3:1]>[3:18](30,47)a: a(href='/'␣+␣url)",
			"[3:3]>[3:17](32,46)href: href='/'␣+␣url",
			'  [3:3]>[3:3](32,32)bN: ',
			'  [3:3]>[3:7](32,36)name: href',
			'  [3:7]>[3:7](36,36)bE: ',
			'  [3:7]>[3:8](36,37)equal: =',
			'  [3:8]>[3:8](37,37)aE: ',
			'  [3:8]>[3:8](37,37)sQ: ',
			"  [3:8]>[3:17](37,46)value: '/'␣+␣url",
			'  [3:17]>[3:17](46,46)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			'[3:19]>[3:23](48,52)#text: Link',
			'[4:1]>[4:1](53,53)#ps:Code: ',
			'[5:1]>[5:12](84,95)a: a(href=url)',
			'[5:3]>[5:11](86,94)href: href=url',
			'  [5:3]>[5:3](86,86)bN: ',
			'  [5:3]>[5:7](86,90)name: href',
			'  [5:7]>[5:7](90,90)bE: ',
			'  [5:7]>[5:8](90,91)equal: =',
			'  [5:8]>[5:8](91,91)aE: ',
			'  [5:8]>[5:8](91,91)sQ: ',
			'  [5:8]>[5:11](91,94)value: url',
			'  [5:11]>[5:11](94,94)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			'[5:13]>[5:25](96,108)#text: Another␣link',
		]);
	});

	test('Attribute Interpolation (ES2015 template strings)', () => {
		const doc = parse(
			`
- var btnType = 'info'
- var btnSize = 'lg'
button(type='button' class='btn btn-' + btnType + ' btn-' + btnSize)
button(type='button' class=\`btn btn-$\{btnType} btn-$\{btnSize}\`)
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:1](1,1)#ps:Code: ',
			'[3:1]>[3:1](24,24)#ps:Code: ',
			"[4:1]>[4:69](45,113)button: button(type='button'␣class='btn␣btn-'␣+␣btnType␣+␣'␣btn-'␣+␣btnSize)",
			"[4:8]>[4:21](52,65)type: type='button'",
			'  [4:8]>[4:8](52,52)bN: ',
			'  [4:8]>[4:12](52,56)name: type',
			'  [4:12]>[4:12](56,56)bE: ',
			'  [4:12]>[4:13](56,57)equal: =',
			'  [4:13]>[4:13](57,57)aE: ',
			"  [4:13]>[4:14](57,58)sQ: '",
			'  [4:14]>[4:20](58,64)value: button',
			"  [4:20]>[4:21](64,65)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[4:22]>[4:68](66,112)class: class='btn␣btn-'␣+␣btnType␣+␣'␣btn-'␣+␣btnSize",
			'  [4:22]>[4:22](66,66)bN: ',
			'  [4:22]>[4:27](66,71)name: class',
			'  [4:27]>[4:27](71,71)bE: ',
			'  [4:27]>[4:28](71,72)equal: =',
			'  [4:28]>[4:28](72,72)aE: ',
			'  [4:28]>[4:28](72,72)sQ: ',
			"  [4:28]>[4:68](72,112)value: 'btn␣btn-'␣+␣btnType␣+␣'␣btn-'␣+␣btnSize",
			'  [4:68]>[4:68](112,112)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			"[5:1]>[5:64](114,177)button: button(type='button'␣class=`btn␣btn-${btnType}␣btn-${btnSize}`)",
			"[5:8]>[5:21](121,134)type: type='button'",
			'  [5:8]>[5:8](121,121)bN: ',
			'  [5:8]>[5:12](121,125)name: type',
			'  [5:12]>[5:12](125,125)bE: ',
			'  [5:12]>[5:13](125,126)equal: =',
			'  [5:13]>[5:13](126,126)aE: ',
			"  [5:13]>[5:14](126,127)sQ: '",
			'  [5:14]>[5:20](127,133)value: button',
			"  [5:20]>[5:21](133,134)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[5:22]>[5:63](135,176)class: class=`btn␣btn-${btnType}␣btn-${btnSize}`',
			'  [5:22]>[5:22](135,135)bN: ',
			'  [5:22]>[5:27](135,140)name: class',
			'  [5:27]>[5:27](140,140)bE: ',
			'  [5:27]>[5:28](140,141)equal: =',
			'  [5:28]>[5:28](141,141)aE: ',
			'  [5:28]>[5:28](141,141)sQ: ',
			'  [5:28]>[5:63](141,176)value: `btn␣btn-${btnType}␣btn-${btnSize}`',
			'  [5:63]>[5:63](176,176)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
		]);
	});

	// https://pugjs.org/language/attributes.html#unescaped-attributes
	test('Unescaped Attributes', () => {
		const doc = parse(
			`
div(escaped="<code>")
div(unescaped!="<code>")
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:22](1,22)div: div(escaped="<code>")',
			'[2:5]>[2:21](5,21)escaped: escaped="<code>"',
			'  [2:5]>[2:5](5,5)bN: ',
			'  [2:5]>[2:12](5,12)name: escaped',
			'  [2:12]>[2:12](12,12)bE: ',
			'  [2:12]>[2:13](12,13)equal: =',
			'  [2:13]>[2:13](13,13)aE: ',
			'  [2:13]>[2:14](13,14)sQ: "',
			'  [2:14]>[2:20](14,20)value: <code>',
			'  [2:20]>[2:21](20,21)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[3:1]>[3:25](23,47)div: div(unescaped!="<code>")',
			'[3:5]>[3:24](27,46)unescaped: unescaped!="<code>"',
			'  [3:5]>[3:5](27,27)bN: ',
			'  [3:5]>[3:15](27,37)name: unescaped!',
			'  [3:15]>[3:15](37,37)bE: ',
			'  [3:15]>[3:16](37,38)equal: =',
			'  [3:16]>[3:16](38,38)aE: ',
			'  [3:16]>[3:17](38,39)sQ: "',
			'  [3:17]>[3:23](39,45)value: <code>',
			'  [3:23]>[3:24](45,46)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: unescaped',
			'  valueType: code',
		]);
	});

	// https://pugjs.org/language/attributes.html#boolean-attributes
	test('Boolean Attributes', () => {
		const doc = parse(
			`
input(type='checkbox' checked)
input(type='checkbox' checked=true)
input(type='checkbox' checked=false)
input(type='checkbox' checked=true && 'checked')
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			"[2:1]>[2:31](1,31)input: input(type='checkbox'␣checked)",
			"[2:7]>[2:22](7,22)type: type='checkbox'",
			'  [2:7]>[2:7](7,7)bN: ',
			'  [2:7]>[2:11](7,11)name: type',
			'  [2:11]>[2:11](11,11)bE: ',
			'  [2:11]>[2:12](11,12)equal: =',
			'  [2:12]>[2:12](12,12)aE: ',
			"  [2:12]>[2:13](12,13)sQ: '",
			'  [2:13]>[2:21](13,21)value: checkbox',
			"  [2:21]>[2:22](21,22)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[2:23]>[2:30](23,30)checked: checked',
			'  [2:23]>[2:23](23,23)bN: ',
			'  [2:23]>[2:30](23,30)name: checked',
			'  [2:30]>[2:30](30,30)bE: ',
			'  [2:30]>[2:30](30,30)equal: ',
			'  [2:30]>[2:30](30,30)aE: ',
			'  [2:30]>[2:30](30,30)sQ: ',
			'  [2:30]>[2:30](30,30)value: ',
			'  [2:30]>[2:30](30,30)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			"[3:1]>[3:36](32,67)input: input(type='checkbox'␣checked=true)",
			"[3:7]>[3:22](38,53)type: type='checkbox'",
			'  [3:7]>[3:7](38,38)bN: ',
			'  [3:7]>[3:11](38,42)name: type',
			'  [3:11]>[3:11](42,42)bE: ',
			'  [3:11]>[3:12](42,43)equal: =',
			'  [3:12]>[3:12](43,43)aE: ',
			"  [3:12]>[3:13](43,44)sQ: '",
			'  [3:13]>[3:21](44,52)value: checkbox',
			"  [3:21]>[3:22](52,53)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[3:23]>[3:35](54,66)checked: checked=true',
			'  [3:23]>[3:23](54,54)bN: ',
			'  [3:23]>[3:30](54,61)name: checked',
			'  [3:30]>[3:30](61,61)bE: ',
			'  [3:30]>[3:31](61,62)equal: =',
			'  [3:31]>[3:31](62,62)aE: ',
			'  [3:31]>[3:31](62,62)sQ: ',
			'  [3:31]>[3:35](62,66)value: true',
			'  [3:35]>[3:35](66,66)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  valueType: boolean',
			"[4:1]>[4:37](68,104)input: input(type='checkbox'␣checked=false)",
			"[4:7]>[4:22](74,89)type: type='checkbox'",
			'  [4:7]>[4:7](74,74)bN: ',
			'  [4:7]>[4:11](74,78)name: type',
			'  [4:11]>[4:11](78,78)bE: ',
			'  [4:11]>[4:12](78,79)equal: =',
			'  [4:12]>[4:12](79,79)aE: ',
			"  [4:12]>[4:13](79,80)sQ: '",
			'  [4:13]>[4:21](80,88)value: checkbox',
			"  [4:21]>[4:22](88,89)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[4:23]>[4:36](90,103)checked: checked=false',
			'  [4:23]>[4:23](90,90)bN: ',
			'  [4:23]>[4:30](90,97)name: checked',
			'  [4:30]>[4:30](97,97)bE: ',
			'  [4:30]>[4:31](97,98)equal: =',
			'  [4:31]>[4:31](98,98)aE: ',
			'  [4:31]>[4:31](98,98)sQ: ',
			'  [4:31]>[4:36](98,103)value: false',
			'  [4:36]>[4:36](103,103)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  valueType: boolean',
			"[5:1]>[5:49](105,153)input: input(type='checkbox'␣checked=true␣&&␣'checked')",
			"[5:7]>[5:22](111,126)type: type='checkbox'",
			'  [5:7]>[5:7](111,111)bN: ',
			'  [5:7]>[5:11](111,115)name: type',
			'  [5:11]>[5:11](115,115)bE: ',
			'  [5:11]>[5:12](115,116)equal: =',
			'  [5:12]>[5:12](116,116)aE: ',
			"  [5:12]>[5:13](116,117)sQ: '",
			'  [5:13]>[5:21](117,125)value: checkbox',
			"  [5:21]>[5:22](125,126)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			"[5:23]>[5:48](127,152)checked: checked=true␣&&␣'checked'",
			'  [5:23]>[5:23](127,127)bN: ',
			'  [5:23]>[5:30](127,134)name: checked',
			'  [5:30]>[5:30](134,134)bE: ',
			'  [5:30]>[5:31](134,135)equal: =',
			'  [5:31]>[5:31](135,135)aE: ',
			'  [5:31]>[5:31](135,135)sQ: ',
			"  [5:31]>[5:48](135,152)value: true␣&&␣'checked'",
			'  [5:48]>[5:48](152,152)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
		]);
	});

	// https://pugjs.org/language/attributes.html#style-attributes
	test('Style Attributes', () => {
		const doc = parse(
			`
a(style={color: 'red', background: 'green'})
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			"[2:1]>[2:45](1,45)a: a(style={color:␣'red',␣background:␣'green'})",
			"[2:3]>[2:44](3,44)style: style={color:␣'red',␣background:␣'green'}",
			'  [2:3]>[2:3](3,3)bN: ',
			'  [2:3]>[2:8](3,8)name: style',
			'  [2:8]>[2:8](8,8)bE: ',
			'  [2:8]>[2:9](8,9)equal: =',
			'  [2:9]>[2:9](9,9)aE: ',
			'  [2:9]>[2:9](9,9)sQ: ',
			"  [2:9]>[2:44](9,44)value: {color:␣'red',␣background:␣'green'}",
			'  [2:44]>[2:44](44,44)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
		]);
	});

	// https://pugjs.org/language/attributes.html#class-attributes
	test('Class Attributes', () => {
		const doc = parse(
			`
- var classes = ['foo', 'bar', 'baz']
a(class=classes)
//- the class attribute may also be repeated to merge arrays
a.bang(class=classes class=['bing'])
- var currentUrl = '/about'
a(class={active: currentUrl === '/'} href='/') Home
a(class={active: currentUrl === '/about'} href='/about') About
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:1](1,1)#ps:Code: ',
			'[3:1]>[3:17](39,55)a: a(class=classes)',
			'[3:3]>[3:16](41,54)class: class=classes',
			'  [3:3]>[3:3](41,41)bN: ',
			'  [3:3]>[3:8](41,46)name: class',
			'  [3:8]>[3:8](46,46)bE: ',
			'  [3:8]>[3:9](46,47)equal: =',
			'  [3:9]>[3:9](47,47)aE: ',
			'  [3:9]>[3:9](47,47)sQ: ',
			'  [3:9]>[3:16](47,54)value: classes',
			'  [3:16]>[3:16](54,54)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			'[4:1]>[4:1](56,56)#comment: ',
			"[5:1]>[5:37](117,153)a: a.bang(class=classes␣class=['bing'])",
			'[5:2]>[5:7](118,123)class: .bang',
			'  [5:2]>[5:2](118,118)bN: ',
			'  [5:2]>[5:2](118,118)name: ',
			'  [5:2]>[5:2](118,118)bE: ',
			'  [5:2]>[5:2](118,118)equal: ',
			'  [5:2]>[5:2](118,118)aE: ',
			'  [5:2]>[5:2](118,118)sQ: ',
			'  [5:2]>[5:7](118,123)value: .bang',
			'  [5:7]>[5:7](123,123)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: class',
			'  potentialValue: bang',
			'[5:8]>[5:21](124,137)class: class=classes',
			'  [5:8]>[5:8](124,124)bN: ',
			'  [5:8]>[5:13](124,129)name: class',
			'  [5:13]>[5:13](129,129)bE: ',
			'  [5:13]>[5:14](129,130)equal: =',
			'  [5:14]>[5:14](130,130)aE: ',
			'  [5:14]>[5:14](130,130)sQ: ',
			'  [5:14]>[5:21](130,137)value: classes',
			'  [5:21]>[5:21](137,137)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			"[5:22]>[5:36](138,152)class: class=['bing']",
			'  [5:22]>[5:22](138,138)bN: ',
			'  [5:22]>[5:27](138,143)name: class',
			'  [5:27]>[5:27](143,143)bE: ',
			'  [5:27]>[5:28](143,144)equal: =',
			'  [5:28]>[5:28](144,144)aE: ',
			'  [5:28]>[5:28](144,144)sQ: ',
			"  [5:28]>[5:36](144,152)value: ['bing']",
			'  [5:36]>[5:36](152,152)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			'[6:1]>[6:1](154,154)#ps:Code: ',
			"[7:1]>[7:47](182,228)a: a(class={active:␣currentUrl␣===␣'/'}␣href='/')",
			"[7:3]>[7:37](184,218)class: class={active:␣currentUrl␣===␣'/'}",
			'  [7:3]>[7:3](184,184)bN: ',
			'  [7:3]>[7:8](184,189)name: class',
			'  [7:8]>[7:8](189,189)bE: ',
			'  [7:8]>[7:9](189,190)equal: =',
			'  [7:9]>[7:9](190,190)aE: ',
			'  [7:9]>[7:9](190,190)sQ: ',
			"  [7:9]>[7:37](190,218)value: {active:␣currentUrl␣===␣'/'}",
			'  [7:37]>[7:37](218,218)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			"[7:38]>[7:46](219,227)href: href='/'",
			'  [7:38]>[7:38](219,219)bN: ',
			'  [7:38]>[7:42](219,223)name: href',
			'  [7:42]>[7:42](223,223)bE: ',
			'  [7:42]>[7:43](223,224)equal: =',
			'  [7:43]>[7:43](224,224)aE: ',
			"  [7:43]>[7:44](224,225)sQ: '",
			'  [7:44]>[7:45](225,226)value: /',
			"  [7:45]>[7:46](226,227)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[7:48]>[7:52](229,233)#text: Home',
			"[8:1]>[8:57](234,290)a: a(class={active:␣currentUrl␣===␣'/about'}␣href='/about')",
			"[8:3]>[8:42](236,275)class: class={active:␣currentUrl␣===␣'/about'}",
			'  [8:3]>[8:3](236,236)bN: ',
			'  [8:3]>[8:8](236,241)name: class',
			'  [8:8]>[8:8](241,241)bE: ',
			'  [8:8]>[8:9](241,242)equal: =',
			'  [8:9]>[8:9](242,242)aE: ',
			'  [8:9]>[8:9](242,242)sQ: ',
			"  [8:9]>[8:42](242,275)value: {active:␣currentUrl␣===␣'/about'}",
			'  [8:42]>[8:42](275,275)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  valueType: code',
			"[8:43]>[8:56](276,289)href: href='/about'",
			'  [8:43]>[8:43](276,276)bN: ',
			'  [8:43]>[8:47](276,280)name: href',
			'  [8:47]>[8:47](280,280)bE: ',
			'  [8:47]>[8:48](280,281)equal: =',
			'  [8:48]>[8:48](281,281)aE: ',
			"  [8:48]>[8:49](281,282)sQ: '",
			'  [8:49]>[8:55](282,288)value: /about',
			"  [8:55]>[8:56](288,289)eQ: '",
			'  isDirective: false',
			'  isDynamicValue: false',
			'[8:58]>[8:63](291,296)#text: About',
		]);
	});

	// https://pugjs.org/language/attributes.html#class-literal
	test('Class Literal', () => {
		const doc = parse(
			`
a.button
.content
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:9](1,9)a: a.button',
			'[2:2]>[2:9](2,9)class: .button',
			'  [2:2]>[2:2](2,2)bN: ',
			'  [2:2]>[2:2](2,2)name: ',
			'  [2:2]>[2:2](2,2)bE: ',
			'  [2:2]>[2:2](2,2)equal: ',
			'  [2:2]>[2:2](2,2)aE: ',
			'  [2:2]>[2:2](2,2)sQ: ',
			'  [2:2]>[2:9](2,9)value: .button',
			'  [2:9]>[2:9](9,9)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: class',
			'  potentialValue: button',
			'[3:1]>[3:9](10,18)div: .content',
			'[3:1]>[3:9](10,18)class: .content',
			'  [3:1]>[3:1](10,10)bN: ',
			'  [3:1]>[3:1](10,10)name: ',
			'  [3:1]>[3:1](10,10)bE: ',
			'  [3:1]>[3:1](10,10)equal: ',
			'  [3:1]>[3:1](10,10)aE: ',
			'  [3:1]>[3:1](10,10)sQ: ',
			'  [3:1]>[3:9](10,18)value: .content',
			'  [3:9]>[3:9](18,18)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: class',
			'  potentialValue: content',
		]);
	});

	// https://pugjs.org/language/attributes.html#id-literal
	test('ID Literal', () => {
		const doc = parse(
			`
a#main-link
#content
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:12](1,12)a: a#main-link',
			'[2:2]>[2:12](2,12)id: #main-link',
			'  [2:2]>[2:2](2,2)bN: ',
			'  [2:2]>[2:2](2,2)name: ',
			'  [2:2]>[2:2](2,2)bE: ',
			'  [2:2]>[2:2](2,2)equal: ',
			'  [2:2]>[2:2](2,2)aE: ',
			'  [2:2]>[2:2](2,2)sQ: ',
			'  [2:2]>[2:12](2,12)value: #main-link',
			'  [2:12]>[2:12](12,12)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: id',
			'  potentialValue: main-link',
			'[3:1]>[3:9](13,21)div: #content',
			'[3:1]>[3:9](13,21)id: #content',
			'  [3:1]>[3:1](13,13)bN: ',
			'  [3:1]>[3:1](13,13)name: ',
			'  [3:1]>[3:1](13,13)bE: ',
			'  [3:1]>[3:1](13,13)equal: ',
			'  [3:1]>[3:1](13,13)aE: ',
			'  [3:1]>[3:1](13,13)sQ: ',
			'  [3:1]>[3:9](13,21)value: #content',
			'  [3:9]>[3:9](21,21)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: id',
			'  potentialValue: content',
		]);
	});

	// https://pugjs.org/language/attributes.html#attributes
	test('&attributes', () => {
		const doc = parse(
			`
div#foo(data-bar="foo")&attributes({'data-foo': 'bar'})
- var attributes = {};
- attributes.class = 'baz';
div#foo(data-bar="foo")&attributes(attributes)
			`,
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:24](1,24)div: div#foo(data-bar="foo")',
			'[2:4]>[2:8](4,8)id: #foo',
			'  [2:4]>[2:4](4,4)bN: ',
			'  [2:4]>[2:4](4,4)name: ',
			'  [2:4]>[2:4](4,4)bE: ',
			'  [2:4]>[2:4](4,4)equal: ',
			'  [2:4]>[2:4](4,4)aE: ',
			'  [2:4]>[2:4](4,4)sQ: ',
			'  [2:4]>[2:8](4,8)value: #foo',
			'  [2:8]>[2:8](8,8)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: id',
			'  potentialValue: foo',
			'[2:9]>[2:23](9,23)data-bar: data-bar="foo"',
			'  [2:9]>[2:9](9,9)bN: ',
			'  [2:9]>[2:17](9,17)name: data-bar',
			'  [2:17]>[2:17](17,17)bE: ',
			'  [2:17]>[2:18](17,18)equal: =',
			'  [2:18]>[2:18](18,18)aE: ',
			'  [2:18]>[2:19](18,19)sQ: "',
			'  [2:19]>[2:22](19,22)value: foo',
			'  [2:22]>[2:23](22,23)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			"[2:36]>[2:55](36,55)#spread: {'data-foo':␣'bar'}",
			"  #spread: {'data-foo':␣'bar'}",
			'[3:1]>[3:1](57,57)#ps:Code: ',
			'[4:1]>[4:1](80,80)#ps:Code: ',
			'[5:1]>[5:24](108,131)div: div#foo(data-bar="foo")',
			'[5:4]>[5:8](111,115)id: #foo',
			'  [5:4]>[5:4](111,111)bN: ',
			'  [5:4]>[5:4](111,111)name: ',
			'  [5:4]>[5:4](111,111)bE: ',
			'  [5:4]>[5:4](111,111)equal: ',
			'  [5:4]>[5:4](111,111)aE: ',
			'  [5:4]>[5:4](111,111)sQ: ',
			'  [5:4]>[5:8](111,115)value: #foo',
			'  [5:8]>[5:8](115,115)eQ: ',
			'  isDirective: false',
			'  isDynamicValue: false',
			'  potentialName: id',
			'  potentialValue: foo',
			'[5:9]>[5:23](116,130)data-bar: data-bar="foo"',
			'  [5:9]>[5:9](116,116)bN: ',
			'  [5:9]>[5:17](116,124)name: data-bar',
			'  [5:17]>[5:17](124,124)bE: ',
			'  [5:17]>[5:18](124,125)equal: =',
			'  [5:18]>[5:18](125,125)aE: ',
			'  [5:18]>[5:19](125,126)sQ: "',
			'  [5:19]>[5:22](126,129)value: foo',
			'  [5:22]>[5:23](129,130)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[5:36]>[5:46](143,153)#spread: attributes',
			'  #spread: attributes',
		]);
	});
});

// https://pugjs.org/language/interpolation.html
describe('Interpolation', () => {
	test('String Interpolation, Escaped', () => {
		const doc = parse(
			`h1= title
p Written with love by #{author}
p This will be safe: #{theGreat}

p This is #{msg.toUpperCase()}

p No escaping for #{'}'}!

p Escaping works with \\#{interpolation}
p Interpolation works with #{'#{interpolation}'} too!`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:3](0,2)h1: h1',
			'[1:3]>[1:10](2,9)#ps:Code: =␣title',
			'[2:1]>[2:2](10,11)p: p',
			'[2:3]>[2:24](12,33)#text: Written␣with␣love␣by␣',
			'[2:24]>[2:33](33,42)#ps:Code: #{author}',
			'[3:1]>[3:2](43,44)p: p',
			'[3:3]>[3:22](45,64)#text: This␣will␣be␣safe:␣',
			'[3:22]>[3:33](64,75)#ps:Code: #{theGreat}',
			'[5:1]>[5:2](77,78)p: p',
			'[5:3]>[5:11](79,87)#text: This␣is␣',
			'[5:11]>[5:31](87,107)#ps:Code: #{msg.toUpperCase()}',
			'[7:1]>[7:2](109,110)p: p',
			'[7:3]>[7:19](111,127)#text: No␣escaping␣for␣',
			"[7:19]>[7:25](127,133)#ps:Code: #{'}'}",
			'[7:25]>[7:26](133,134)#text: !',
			'[9:1]>[9:2](136,137)p: p',
			'[9:3]>[9:40](138,175)#text: Escaping␣works␣with␣\\#{interpolation}',
			'[10:1]>[10:2](176,177)p: p',
			'[10:3]>[10:28](178,203)#text: Interpolation␣works␣with␣',
			"[10:28]>[10:49](203,224)#ps:Code: #{'#{interpolation}'}",
			'[10:49]>[10:54](224,229)#text: ␣too!',
		]);
	});

	// https://pugjs.org/language/interpolation.html#string-interpolation-unescaped
	test('String Interpolation, Unescaped', () => {
		const doc = parse(
			`.quote
  p Joel: !{riskyBusiness}`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:7](0,6)div: .quote',
			'[2:3]>[2:4](9,10)p: p',
			'[2:5]>[2:11](11,17)#text: Joel:␣',
			'[2:11]>[2:27](17,33)#ps:Code: !{riskyBusiness}',
		]);
	});

	// https://pugjs.org/language/interpolation.html#tag-interpolation
	test('Tag Interpolation', () => {
		const doc = parse(
			`p.
  This is a very long and boring paragraph that spans multiple lines.
  Suddenly there is a #[strong strongly worded phrase] that cannot be
  #[em ignored].
p.
  And here's an example of an interpolated tag with an attribute:
  #[q(lang="es") ¡Hola Mundo!]`, // cspell:disable-line
		);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[1:1]>[1:2](0,1)p: p',
			'[2:3]>[3:23](5,95)#text: This␣is␣a␣very␣long␣and␣boring␣paragraph␣that␣spans␣multiple␣lines.⏎␣␣Suddenly␣there␣is␣a␣',
			'[3:25]>[3:31](97,103)strong: strong',
			'[3:32]>[3:54](104,126)#text: strongly␣worded␣phrase',
			'[3:55]>[4:3](127,145)#text: ␣that␣cannot␣be⏎␣␣',
			'[4:5]>[4:7](147,149)em: em',
			'[4:8]>[4:15](150,157)#text: ignored',
			'[4:16]>[4:17](158,159)#text: .',
			'[5:1]>[5:2](160,161)p: p',
			"[5:3]>[7:3](162,231)#text: ⏎␣␣And␣here's␣an␣example␣of␣an␣interpolated␣tag␣with␣an␣attribute:⏎␣␣",
			'[7:5]>[7:17](233,245)q: q(lang="es")',
			'[7:7]>[7:16](235,244)lang: lang="es"',
			'  [7:7]>[7:7](235,235)bN: ',
			'  [7:7]>[7:11](235,239)name: lang',
			'  [7:11]>[7:11](239,239)bE: ',
			'  [7:11]>[7:12](239,240)equal: =',
			'  [7:12]>[7:12](240,240)aE: ',
			'  [7:12]>[7:13](240,241)sQ: "',
			'  [7:13]>[7:15](241,243)value: es',
			'  [7:15]>[7:16](243,244)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[7:18]>[7:30](246,258)#text: ¡Hola␣Mundo!', // cspell:disable-line
		]);
	});

	// https://pugjs.org/language/interpolation.html#whitespace-control
	test('Whitespace Control', () => {
		const doc = parse(
			`p
  | If I don't write the paragraph with tag interpolation, tags like
  strong strong
  | and
  em em
  | might produce unexpected results.
p.
  If I do, whitespace is #[strong respected] and #[em everybody] is happy.`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:2](0,1)p: p',
			"[2:5]>[2:69](6,70)#text: If␣I␣don't␣write␣the␣paragraph␣with␣tag␣interpolation,␣tags␣like",
			'[3:3]>[3:9](73,79)strong: strong',
			'[3:10]>[3:16](80,86)#text: strong',
			'[4:5]>[4:8](91,94)#text: and',
			'[5:3]>[5:5](97,99)em: em',
			'[5:6]>[5:8](100,102)#text: em',
			'[6:5]>[6:38](107,140)#text: might␣produce␣unexpected␣results.',
			'[7:1]>[7:2](141,142)p: p',
			'[8:3]>[8:26](146,169)#text: If␣I␣do,␣whitespace␣is␣',
			'[8:28]>[8:34](171,177)strong: strong',
			'[8:35]>[8:44](178,187)#text: respected',
			'[8:45]>[8:50](188,193)#text: ␣and␣',
			'[8:52]>[8:54](195,197)em: em',
			'[8:55]>[8:64](198,207)#text: everybody',
			'[8:65]>[8:75](208,218)#text: ␣is␣happy.',
		]);
	});
});

// https://pugjs.org/language/plain-text.html#whitespace-control
describe('Whitespace Control', () => {
	test('Pipe 1', () => {
		const doc = parse(
			`| You put the em
em pha
| sis on the wrong syl
em la
| ble.`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:3]>[1:17](2,16)#text: You␣put␣the␣em',
			'[2:1]>[2:3](17,19)em: em',
			'[2:4]>[2:7](20,23)#text: pha',
			'[3:3]>[3:23](26,46)#text: sis␣on␣the␣wrong␣syl',
			'[4:1]>[4:3](47,49)em: em',
			'[4:4]>[4:6](50,52)#text: la',
			'[5:3]>[5:7](55,59)#text: ble.',
		]);
	});

	test('Pipe 2', () => {
		const doc = parse(
			`a ...sentence ending with a link
| .`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:2](0,1)a: a',
			'[1:3]>[1:33](2,32)#text: ...sentence␣ending␣with␣a␣link',
			'[2:3]>[2:4](35,36)#text: .',
		]);
	});

	// https://pugjs.org/language/plain-text.html#recommended-solutions
	test('Recommended Solutions (Empty pipe)', () => {
		const doc = parse(
			`| Don't
|
button#self-destruct touch
|
| me!`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			"[1:3]>[1:8](2,7)#text: Don't",
			'[3:1]>[3:21](10,30)button: button#self-destruct',
			'[3:22]>[3:27](31,36)#text: touch',
			'[5:3]>[5:6](41,44)#text: me!',
		]);
	});

	test('Recommended Solutions (plain text block)', () => {
		const doc = parse(
			`p.
  Using regular tags can help keep your lines short,
  but interpolated tags may be easier to #[em visualize]
  whether the tags and text are whitespace-separated.`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:2](0,1)p: p',
			'[1:3]>[3:42](2,97)#text: ⏎␣␣Using␣regular␣tags␣can␣help␣keep␣your␣lines␣short,⏎␣␣but␣interpolated␣tags␣may␣be␣easier␣to␣',
			'[3:44]>[3:46](99,101)em: em',
			'[3:47]>[3:56](102,111)#text: visualize',
			'[3:57]>[4:54](112,166)#text: ⏎␣␣whether␣the␣tags␣and␣text␣are␣whitespace-separated.',
		]);
	});

	test('Not recommended', () => {
		const doc = parse(
			`| Hey, check out
a(href="http://example.biz/kitteh.png") this picture
|  of my cat!`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:3]>[1:17](2,16)#text: Hey,␣check␣out',
			'[2:1]>[2:40](17,56)a: a(href="http://example.biz/kitteh.png")',
			'[2:41]>[2:53](57,69)#text: this␣picture',
			'[3:3]>[3:14](72,83)#text: ␣of␣my␣cat!',
		]);
	});

	test("Complex code (Doesn't support it)", () => {
		// https://github.com/markuplint/markuplint/issues/2184
		const doc = parse(
			`
div.
  span 1#[em 2 #[s 3 <span>4</span>]]
<div>
  span 5#[em 6]
  <strong>no-tag 7</strong>
  <strong>
  this-is-tag 8</strong>
</div>
`,
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		const tree = nodeTreeDebugView(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:1]>[2:4](1,4)div: div',
			'[3:3]>[3:9](8,14)#text: span␣1',
			'[3:11]>[3:13](16,18)em: em',
			'[3:14]>[3:16](19,21)#text: 2␣',
			'[3:18]>[3:19](23,24)s: s',
			'[3:20]>[3:22](25,27)#text: 3␣',
			'[3:22]>[3:28](27,33)span: <span>',
			'[3:28]>[3:29](33,34)#text: 4',
			'[3:29]>[3:36](34,41)span: </span>',
			'[4:1]>[4:6](44,49)div: <div>',
			'[5:3]>[5:7](52,56)span: span',
			'[5:8]>[5:9](57,58)#text: 5',
			'[5:11]>[5:13](60,62)em: em',
			'[5:14]>[5:15](63,64)#text: 6',
			'[6:3]>[6:11](68,76)strong: <strong>',
			'[6:11]>[6:19](76,84)#text: no-tag␣7',
			'[6:19]>[6:28](84,93)strong: </strong>',
			'[6:28]>[7:3](93,96)#text: ⏎␣␣',
			'[7:3]>[7:11](96,104)strong: <strong>',
			'[8:3]>[8:14](107,118)this-is-tag: this-is-tag',
			'[8:15]>[8:16](119,120)#text: 8',
			'[8:16]>[8:25](120,129)#invalid(👿): </strong>',
		]);
		expect(tree).toStrictEqual([
			'000: [0000] div(0000) => 💀',
			'                  ┗━ #text(0001)',
			'                  ┗━ em(0002)',
			'001: [0001]   #text(0001)',
			'002: [0002]   em(0002) => 💀',
			'                    ┗━ #text(0003)',
			'                    ┗━ s(0004)',
			'003: [0003]     #text(0003)',
			'004: [0004]     s(0004) => 💀',
			'                      ┗━ #text(0005)',
			'                      ┗━ span(0006)',
			'                      ┗━ /span(0007)',
			'005: [0005]       #text(0005)',
			'006: [0006]       span(0006) => /span(0007)',
			'                        ┗━ #text(0008)',
			'007: [0008]         #text(0008)',
			'008: [0007]       /span(0007)',
			'009: [0009] div(0009) => 💀',
			'010: [000a] span(000a) => 💀',
			'                  ┗━ #text(000b)',
			'                  ┗━ em(000c)',
			'011: [000b]   #text(000b)',
			'012: [000c]   em(000c) => 💀',
			'                    ┗━ #text(000d)',
			'013: [000d]     #text(000d)',
			'014: [000e] strong(000e) => /strong(000f)',
			'                  ┗━ #text(0010)',
			'015: [0010]   #text(0010)',
			'016: [000f] /strong(000f)',
			'017: [0011] #text(0011)',
			'018: [0012] strong(0012) => 💀',
			'019: [0013] this-is-tag(0013) => 💀',
			'                  ┗━ #text(0014)',
			'                  ┗━ #invalid(0015)',
			'020: [0014]   #text(0014)',
			'021: [0015]   #invalid(0015)',
		]);
	});
});

describe('Issues', () => {
	test('#1221', () => {
		const doc = parse('html: p <span>text</span>');
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)html: html',
			'[1:7]>[1:8](6,7)p: p',
			'[1:9]>[1:15](8,14)span: <span>',
			'[1:15]>[1:19](14,18)#text: text',
			'[1:19]>[1:26](18,25)span: </span>',
		]);

		const html = doc.nodeList[0];
		const p = doc.nodeList[1];
		const span = doc.nodeList[2];
		const text = doc.nodeList[3];
		const spanClose = doc.nodeList[4];

		expect(html.uuid).toBe(p.parentNode.uuid);
		expect(html.childNodes.length).toBe(1);
		expect(p.uuid).toBe(html.childNodes[0].uuid);
		expect(p.childNodes.length).toBe(2);
		expect(span.uuid).toBe(p.childNodes[0].uuid);
		expect(span.childNodes.length).toBe(1);
		expect(text.uuid).toBe(span.childNodes[0].uuid);
		expect(spanClose.uuid).toBe(span.pairNode.uuid);
	});

	test('#1741', () => {
		const doc = parse(`
html
	head
		block head
			+meta
	body
		p Hello, World!
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:1]>[2:5](1,5)html: html',
			'[3:2]>[3:6](7,11)head: head',
			'[4:3]>[4:13](14,24)#ps:NamedBlock: block␣head',
			'[5:4]>[5:9](28,33)#ps:Mixin: +meta',
			'[6:2]>[6:6](35,39)body: body',
			'[7:3]>[7:4](42,43)p: p',
			'[7:5]>[7:18](44,57)#text: Hello,␣World!',
		]);
	});

	test('#2108', () => {
		const doc = parse(`div
	include ./path/to/image.svg`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			//
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:29](5,32)#ps:RawInclude: include␣./path/to/image.svg',
		]);
	});

	test('#2109', () => {
		const doc = parse(`//- div
	span
	span`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual(['[1:1]>[3:6](0,19)#comment: //-␣div⏎→span⏎→span']);
	});

	test('#2110', () => {
		const doc = parse(`div
	include ./path/to/image.svg`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			//
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:29](5,32)#ps:RawInclude: include␣./path/to/image.svg',
		]);
	});

	test('#2110', () => {
		const doc = parse(`mixin foo
	if bar
		<meta>
	else
		<meta>
	<meta>
	<meta>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:10](0,9)#ps:Mixin: mixin␣foo',
			'[2:2]>[2:8](11,17)#ps:Conditional: if␣bar',
			'[3:3]>[3:9](20,26)meta: <meta>',
			'[4:2]>[4:6](28,32)#ps:Conditional: else',
			'[5:3]>[5:9](35,41)meta: <meta>',
			'[6:2]>[6:8](43,49)meta: <meta>',
			'[6:8]>[7:2](49,51)#text: ⏎→',
			'[7:2]>[7:8](51,57)meta: <meta>',
		]);
	});

	test('#2440', () => {
		const doc = parse(`div
	div
		#{_variable_}= _value_
	div
		#{_variable_}
			span child text content`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:5](5,8)div: div',
			'[3:3]>[3:16](11,24)#ps:InterpolatedTag: #{_variable_}',
			'[3:16]>[3:25](24,33)#ps:Code: =␣_value_',
			'[4:2]>[4:5](35,38)div: div',
			'[5:3]>[5:16](41,54)#ps:InterpolatedTag: #{_variable_}',
			'[6:4]>[6:8](58,62)span: span',
			'[6:9]>[6:27](63,81)#text: child␣text␣content',
		]);

		const tree = nodeTreeDebugView(doc.nodeList, true);
		expect(tree).toStrictEqual([
			'000: [0016] div(0016) => 💀',
			'                  ┗━ div(0017)',
			'                  ┗━ div(0018)',
			'001: [0017]   div(0017) => 💀',
			'                    ┗━ #ps:InterpolatedTag(0019)',
			'002: [0019]     #ps:InterpolatedTag(0019)',
			'                      ┗━ #ps:Code(001a)',
			'003: [001a]       #ps:Code(001a)',
			'004: [0018]   div(0018) => 💀',
			'                    ┗━ #ps:InterpolatedTag(001b)',
			'005: [001b]     #ps:InterpolatedTag(001b)',
			'                      ┗━ span(001c)',
			'006: [001c]       span(001c) => 💀',
			'                        ┗━ #text(001d)',
			'007: [001d]         #text(001d)',
		]);
	});
});
