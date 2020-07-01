import { MLASTElement, MLASTHTMLAttr } from '@markuplint/ml-ast';
import { nodeListToDebugMaps } from '@markuplint/html-parser';
import { parse } from './';
// import { MLASTNodeType } from '@markuplint/ml-ast';

describe('parser', () => {
	// it('<!DOCTYPE html>', () => {
	// 	const doc = parse('<!DOCTYPE html>');
	// 	expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
	// 	expect(doc.nodeList[1].nodeName).toBe('html');
	// 	expect(doc.nodeList[2].nodeName).toBe('head');
	// 	expect(doc.nodeList[3].nodeName).toBe('body');
	// 	expect(doc.nodeList.length).toBe(4);
	// });
	// it('<!DOCTYPE html>\\ntext', () => {
	// 	const doc = parse('<!DOCTYPE html>\ntext');
	// 	expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
	// 	expect(doc.nodeList[1].nodeName).toBe('html');
	// 	expect(doc.nodeList[2].nodeName).toBe('head');
	// 	expect(doc.nodeList[3].nodeName).toBe('body');
	// 	expect(doc.nodeList[4].type).toBe(MLASTNodeType.Text);
	// 	expect(doc.nodeList[4].raw).toBe('\ntext');
	// 	expect(doc.nodeList[4].startCol).toBe(16);
	// 	expect(doc.nodeList.length).toBe(5);
	// });

	it('empty code', () => {
		const doc = parse('');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	it('text only', () => {
		const doc = parse('| text');
		expect(doc.nodeList[0].nodeName).toBe('#text');
		expect(doc.nodeList[0].raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	it('element', () => {
		const doc = parse('div');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe('div');
		expect(doc.nodeList.length).toBe(1);
	});

	it('with attribute', () => {
		const doc = parse('div(data-attr="value")');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe('div(data-attr="value")');
		expect(doc.nodeList.length).toBe(1);
		expect((doc.nodeList[0] as MLASTElement).attributes.length).toBe(1);
		expect(((doc.nodeList[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).name.raw).toBe('data-attr');
		expect(((doc.nodeList[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe('value');
	});

	it('with dynamic attribute', () => {
		const doc = parse(
			'div(data-attr= variable + variable2 data-attr2 = variable3 + variable4 data-attr3 data-attr4 = `${variable5}`)',
		);
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].raw).toBe(
			'div(data-attr= variable + variable2 data-attr2 = variable3 + variable4 data-attr3 data-attr4 = `${variable5}`)',
		);
		expect(doc.nodeList.length).toBe(1);
		expect((doc.nodeList[0] as MLASTElement).attributes.length).toBe(4);
		expect(((doc.nodeList[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).name.raw).toBe('data-attr');
		expect(((doc.nodeList[0] as MLASTElement).attributes[0] as MLASTHTMLAttr).value.raw).toBe(
			'variable + variable2',
		);
		expect(((doc.nodeList[0] as MLASTElement).attributes[1] as MLASTHTMLAttr).name.raw).toBe('data-attr2');
		expect(((doc.nodeList[0] as MLASTElement).attributes[1] as MLASTHTMLAttr).value.raw).toBe(
			'variable3 + variable4',
		);
		expect(((doc.nodeList[0] as MLASTElement).attributes[2] as MLASTHTMLAttr).name.raw).toBe('data-attr3');
		expect(((doc.nodeList[0] as MLASTElement).attributes[2] as MLASTHTMLAttr).value.raw).toBe('');
		expect(((doc.nodeList[0] as MLASTElement).attributes[3] as MLASTHTMLAttr).name.raw).toBe('data-attr4');
		expect(((doc.nodeList[0] as MLASTElement).attributes[3] as MLASTHTMLAttr).value.raw).toBe('${variable5}');
	});

	it('standard code', () => {
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
			'[10:4]>[10:16](211,223)#text: const␣i␣=␣0;',
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

	it('minimum code', () => {
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

	it('deep structure code', () => {
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

	it('code in code', () => {
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

	it('code in code', () => {
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
			'[2:4]>[2:5](11,12)#text: 1',
			'[3:1]>[3:14](13,26)Conditional: else␣if␣bool2',
			'[4:4]>[4:5](30,31)#text: 2',
			'[5:1]>[5:5](13,17)Conditional: else',
			'[6:4]>[6:5](40,41)#text: 3',
		]);
	});
});
