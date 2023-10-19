// @ts-nocheck

import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parse } from './parse.js';

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

	test('with attribute', () => {
		const doc = parse('div(data-attr="value")');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe('div(data-attr="value")');
		expect(doc.nodeList.length).toBe(1);
		expect(doc.nodeList[0].attributes.length).toBe(1);
		expect(doc.nodeList[0].attributes[0].name.raw).toBe('data-attr');
		expect(doc.nodeList[0].attributes[0].value.raw).toBe('value');
	});

	test('with dynamic attribute', () => {
		const doc = parse(
			'div(data-attr= variable + variable2 data-attr2 = variable3 + variable4 data-attr3 data-attr4 = `${variable5}`)',
		);
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe(
			'div(data-attr= variable + variable2 data-attr2 = variable3 + variable4 data-attr3 data-attr4 = `${variable5}`)',
		);
		expect(doc.nodeList.length).toBe(1);
		expect(doc.nodeList[0].attributes.length).toBe(4);
		expect(doc.nodeList[0].attributes[0].name.raw).toBe('data-attr');
		expect(doc.nodeList[0].attributes[0].value.raw).toBe('variable + variable2');
		expect(doc.nodeList[0].attributes[1].name.raw).toBe('data-attr2');
		expect(doc.nodeList[0].attributes[1].value.raw).toBe('variable3 + variable4');
		expect(doc.nodeList[0].attributes[2].name.raw).toBe('data-attr3');
		expect(doc.nodeList[0].attributes[2].value.raw).toBe('');
		expect(doc.nodeList[0].attributes[3].name.raw).toBe('data-attr4');
		expect(doc.nodeList[0].attributes[3].value.raw).toBe('${variable5}');
	});

	test('ID and Classes', () => {
		const doc = parse('div#the-id.the-class.the-class2');
		expect(doc.nodeList[0].attributes[0].potentialName).toBe('id');
		expect(doc.nodeList[0].attributes[0].potentialValue).toBe('the-id');
		expect(doc.nodeList[0].attributes[1].potentialName).toBe('class');
		expect(doc.nodeList[0].attributes[1].potentialValue).toBe('the-class');
		expect(doc.nodeList[0].attributes[2].potentialName).toBe('class');
		expect(doc.nodeList[0].attributes[2].potentialValue).toBe('the-class2');
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
			'[7:9]>[8:2](183,193)#text: Document⏎→',
			'[8:2]>[8:6](193,197)body: body',
			'[9:3]>[9:9](200,206)script: script',
			'[10:4]>[10:16](211,223)#text: const␣i␣=␣0;',
			'[11:3]>[11:18](226,241)#comment: //␣html-comment',
			'[12:3]>[12:6](244,247)div: div',
			'[13:6]>[14:3](253,268)#text: text&amp;div⏎→→',
			'[14:3]>[14:8](268,273)table: table',
			'[15:4]>[15:6](277,279)tr: tr',
			'[16:4]>[16:6](283,285)th: th',
			'[16:7]>[16:13](286,292)#text: header',
			'[17:4]>[17:6](296,298)td: td',
			'[17:7]>[18:3](299,306)#text: cell⏎→→',
			'[18:3]>[18:8](306,311)table: table',
			'[19:4]>[19:9](315,320)tbody: tbody',
			'[20:4]>[20:6](324,326)tr: tr',
			'[21:5]>[21:7](331,333)th: th',
			'[21:8]>[21:14](334,340)#text: header',
			'[22:5]>[22:7](345,347)td: td',
			'[22:8]>[23:3](348,355)#text: cell⏎→→',
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
			'[3:9]>[4:2](19,26)#text: Title⏎→',
			'[4:2]>[4:6](26,30)body: body',
			'[5:3]>[5:5](33,35)h1: h1',
			'[5:6]>[6:1](36,42)#text: Title⏎',
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
			'[2:2]>[2:15](4,17)Each: each␣i␣in␣obj',
			'[3:3]>[3:5](20,22)li: li',
			'[3:5]>[3:8](22,25)Code: =␣i',
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
			'[1:1]>[1:8](0,7)Conditional: if␣bool',
			'[2:4]>[3:1](11,13)#text: 1⏎',
			'[3:1]>[3:14](13,26)Conditional: else␣if␣bool2',
			'[4:4]>[5:1](30,32)#text: 2⏎',
			'[5:1]>[5:5](32,36)Conditional: else',
			'[6:4]>[7:1](40,42)#text: 3⏎',
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
			'[4:4]>[4:25](25,44)img: <img␣src="path/to">',
			'[4:23]>[5:3](44,47)#text: ⏎→→',
			'[5:3]>[5:10](47,54)span: </span>',
			'[5:10]>[6:4](54,58)#text: ⏎→→→',
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
			'[2:2]>[2:13](8,13)div: <div>',
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
			'[2:2]>[2:13](8,13)div: <div>',
			'[2:7]>[3:3](13,16)#text: ⏎→→',
			'[3:3]>[3:16](16,23)img: <img␣/>',
			'[3:10]>[4:2](23,25)#text: ⏎→',
			'[4:2]>[4:8](25,31)div: </div>',
		]);
	});

	test('block-in-tag script', () => {
		const doc = parse(`script.
	const $span = '<span>text</span>';`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:7](0,6)script: script',
			"[2:2]>[2:36](9,43)#text: const␣$span␣=␣'<span>text</span>';",
		]);
	});

	test('block-in-tag script2', () => {
		const doc = parse(`div.
	<script> var a = "<aaaa>"; </script>`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			'[1:1]>[1:4](0,3)div: div',
			'[2:2]>[2:10](6,14)script: <script>',
			'[2:10]>[2:29](14,33)#text: ␣var␣a␣=␣"<aaaa>";␣',
			'[2:29]>[2:38](33,42)script: </script>',
		]);
		const code = doc.nodeList[1].childNodes[0];
		expect(code.raw).toBe(' var a = "<aaaa>"; ');
		expect(code.parentNode.nodeName).toBe('script');
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
			'[2:2]>[2:27](6,27)input: <input␣invalid-attr/>',
			'[2:23]>[3:2](27,29)#text: ⏎→',
			'[3:2]>[3:27](29,50)input: <input␣invalid-attr/>',
		]);
		const input1 = doc.nodeList[2];
		const input2 = doc.nodeList[4];
		expect(input1.startOffset).toBe(6);
		expect(input1.startLine).toBe(2);
		expect(input1.startCol).toBe(2);
		expect(input1.attributes[0].startLine).toBe(2);
		expect(input1.attributes[0].startCol).toBe(9);
		expect(input2.startOffset).toBe(29);
		expect(input2.startLine).toBe(3);
		expect(input2.startCol).toBe(2);
		expect(input2.attributes[0].startLine).toBe(3);
		expect(input2.attributes[0].startCol).toBe(9);
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
			'[22:2]>[22:27](26,47)input: <input␣invalid-attr/>',
			'[22:23]>[23:2](47,49)#text: ⏎→',
			'[23:2]>[23:41](49,84)input: <input␣invalid-attr␣invalid-attr2/>',
		]);
		const input1 = doc.nodeList[2];
		const input2 = doc.nodeList[4];
		const attr1 = input1.attributes[0];
		const attr2 = input2.attributes[0];
		const attr3 = input2.attributes[1];
		expect(attr1.startLine).toBe(22);
		expect(attr1.startCol).toBe(9);
		expect(attr1.name.startLine).toBe(22);
		expect(attr1.name.startCol).toBe(9);
		expect(attr2.startLine).toBe(23);
		expect(attr2.startCol).toBe(9);
		expect(attr2.name.startLine).toBe(23);
		expect(attr2.name.startCol).toBe(9);
		expect(attr3.startLine).toBe(23);
		expect(attr3.startCol).toBe(22);
		expect(attr3.name.startLine).toBe(23);
		expect(attr3.name.startCol).toBe(22);
	});

	// TODO: If there is an HTML tag in siblings
	// it.only('html', () => {
	// 	const doc = parse('div\n<input invalid-attr/>\n<input invalid-attr/>');
	// 	const map = nodeListToDebugMaps(doc.nodeList);
	// 	expect(doc.parseError).toBeUndefined();
	// 	expect(map).toStrictEqual(['[1:1]>[1:4](0,3)div: div', '[2:1]>[2:22](4,25)input: <input␣invalid-attr/>']);
	// 	const input1 = doc.nodeList[1];
	// 	const input2 = doc.nodeList[2];
	// 	const attr1 = input1.attributes[0];
	// 	const attr2 = input2.attributes[0];
	// 	expect(attr1.startLine).toBe(2);
	// 	expect(attr1.startCol).toBe(8);
	// 	expect(attr1.name.startLine).toBe(2);
	// 	expect(attr1.name.startCol).toBe(9);
	// 	expect(attr2.startLine).toBe(3);
	// 	expect(attr2.startCol).toBe(8);
	// 	expect(attr2.name.startLine).toBe(3);
	// 	expect(attr2.name.startCol).toBe(9);
	// });

	test('attribute', () => {
		const doc = parse('div(data-hoge="content")');
		const attr = doc.nodeList[0].attributes[0];
		if (attr.type !== 'html-attr') {
			return;
		}
		expect(attr.raw).toEqual('data-hoge="content"');
		expect(attr.name.raw).toEqual('data-hoge');
		expect(attr.equal.raw).toEqual('=');
		expect(attr.startQuote.raw).toEqual('"');
		expect(attr.value.raw).toEqual('content');
		expect(attr.endQuote.raw).toEqual('"');
	});

	test('attribute 2', () => {
		const doc = parse("div(data-hoge='content')");
		const attr = doc.nodeList[0].attributes[0];
		if (attr.type !== 'html-attr') {
			return;
		}
		expect(attr.raw).toEqual("data-hoge='content'");
		expect(attr.name.raw).toEqual('data-hoge');
		expect(attr.equal.raw).toEqual('=');
		expect(attr.startQuote.raw).toEqual("'");
		expect(attr.value.raw).toEqual('content');
		expect(attr.endQuote.raw).toEqual("'");
	});

	test('attribute 3', () => {
		const doc = parse(`div.
	<span data-attr="value">`);
		// console.log(doc.nodeList);
		const attr = doc.nodeList[1].attributes[0];
		if (attr.type !== 'html-attr') {
			return;
		}
		expect(attr.raw).toEqual('data-attr="value"');
		expect(attr.startCol).toEqual(8);
		expect(attr.name.raw).toEqual('data-attr');
		expect(attr.name.startCol).toEqual(8);
		expect(attr.equal.raw).toEqual('=');
		expect(attr.equal.startCol).toEqual(17);
		expect(attr.startQuote.raw).toEqual('"');
		expect(attr.startQuote.startCol).toEqual(18);
		expect(attr.value.raw).toEqual('value');
		expect(attr.value.startCol).toEqual(19);
		expect(attr.endQuote.raw).toEqual('"');
		expect(attr.endQuote.startCol).toEqual(24);
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
			'[1:1]>[1:4](0,3)#text: ␣␣␣',
			'[4:1]>[4:5](20,24)html: html',
			'[5:2]>[5:6](26,30)head: head',
			'[6:3]>[6:8](33,38)title: title',
			'[6:9]>[7:2](39,46)#text: Title⏎→',
			'[7:2]>[7:6](46,50)body: body',
			'[8:3]>[8:5](53,55)h1: h1',
			'[8:6]>[9:1](56,62)#text: Title⏎',
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
			'[1:1]>[1:4](0,3)#text: ␣␣␣',
			'[4:1]>[4:5](20,24)html: html',
			'[5:2]>[5:6](26,30)head: head',
			'[6:3]>[6:8](33,38)title: title',
			'[6:9]>[7:2](39,46)#text: Title⏎→',
			'[7:2]>[7:6](46,50)body: body',
			'[8:3]>[8:5](53,55)h1: h1',
			'[8:6]>[9:1](56,62)#text: Title⏎',
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
		expect(p.childNodes.length).toBe(1);
		expect(span.uuid).toBe(p.childNodes[0].uuid);
		expect(span.childNodes.length).toBe(1);
		expect(text.uuid).toBe(span.childNodes[0].uuid);
		expect(spanClose.uuid).toBe(span.pearNode.uuid);
	});
});
