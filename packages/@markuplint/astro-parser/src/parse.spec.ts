import type { MLASTElement } from '@markuplint/ml-ast';

import { nodeListToDebugMaps } from '../../parser-utils/lib';

import { parse } from './parse';

it('Basic', () => {
	const ast = parse(`---
const name = "World";
---
<!-- Comment -->
<style>
div {
    color: red;
}
</style>
<div data-attr="value" data-dynamic={value}>Hello {name}!</div>
<ul>
{list.map(item => <li>{item}</li>)}
</ul>
`);
	const map = nodeListToDebugMaps(ast.nodeList, true);
	expect(map).toEqual([
		'[3:4]>[4:1](29,30)#text: ⏎',
		'[4:1]>[4:17](30,46)#comment: <!--␣Comment␣-->',
		'[4:17]>[5:1](46,47)#text: ⏎',
		'[5:1]>[5:8](47,54)style: <style>',
		'[9:1]>[9:9](79,87)style: </style>',
		'[9:9]>[10:1](87,88)#text: ⏎',
		'[10:1]>[10:45](88,132)div: <div␣data-attr="value"␣data-dynamic={value}>',
		'[10:6]>[10:23](93,110)data-attr: data-attr="value"',
		'  [10:5]>[10:6](92,93)bN: ␣',
		'  [10:6]>[10:15](93,102)name: data-attr',
		'  [10:15]>[10:15](102,102)bE: ',
		'  [10:15]>[10:16](102,103)equal: =',
		'  [10:16]>[10:16](103,103)aE: ',
		'  [10:16]>[10:17](103,104)sQ: "',
		'  [10:17]>[10:22](104,109)value: value',
		'  [10:22]>[10:23](109,110)eQ: "',
		'  isDirective: false',
		'  isDynamicValue: false',
		'[10:24]>[10:44](111,131)data-dynamic: data-dynamic={value}',
		'  [10:23]>[10:24](110,111)bN: ␣',
		'  [10:24]>[10:36](111,123)name: data-dynamic',
		'  [10:36]>[10:36](123,123)bE: ',
		'  [10:36]>[10:37](123,124)equal: =',
		'  [10:37]>[10:37](124,124)aE: ',
		'  [10:37]>[10:38](124,125)sQ: {',
		'  [10:38]>[10:43](125,130)value: value',
		'  [10:43]>[10:44](130,131)eQ: }',
		'  isDirective: false',
		'  isDynamicValue: true',
		'[10:45]>[10:51](132,138)#text: Hello␣',
		'[10:51]>[10:57](138,144)MustacheTag: {name}',
		'[10:57]>[10:58](144,145)#text: !',
		'[10:58]>[10:64](145,151)div: </div>',
		'[10:64]>[11:1](151,152)#text: ⏎',
		'[11:1]>[11:5](152,156)ul: <ul>',
		'[11:5]>[12:1](156,157)#text: ⏎',
		'[12:1]>[12:19](157,175)MustacheTag: {list.map(item␣=>␣',
		'[12:19]>[12:23](175,179)li: <li>',
		'[12:23]>[12:29](179,185)MustacheTag: {item}',
		'[12:29]>[12:34](185,190)li: </li>',
		'[12:34]>[12:36](190,192)MustacheTag: )}',
		'[12:36]>[13:1](192,193)#text: ⏎',
		'[13:1]>[13:6](193,198)ul: </ul>',
		'[13:6]>[14:1](198,199)#text: ⏎',
	]);
});

it('HTML', () => {
	const ast = parse(`<html>
  <head>
    <style>
      ...
    </style>
  </head>
  <body>...</body>
</html>
`);
	const map = nodeListToDebugMaps(ast.nodeList, true);
	expect(map).toEqual([
		'[1:1]>[1:7](0,6)html: <html>',
		'[1:7]>[2:3](6,9)#text: ⏎␣␣',
		'[2:3]>[2:9](9,15)head: <head>',
		'[2:9]>[3:5](15,20)#text: ⏎␣␣␣␣',
		'[3:5]>[3:12](20,27)style: <style>',
		'[3:12]>[5:5](27,42)#text: ⏎␣␣␣␣␣␣...⏎␣␣␣␣',
		'[5:5]>[5:13](42,50)style: </style>',
		'[5:13]>[6:3](50,53)#text: ⏎␣␣',
		'[6:3]>[6:10](53,60)head: </head>',
		'[6:10]>[7:3](60,63)#text: ⏎␣␣',
		'[7:3]>[7:9](63,69)body: <body>',
		'[7:9]>[7:12](69,72)#text: ...',
		'[7:12]>[7:19](72,79)body: </body>',
		'[7:19]>[8:1](79,80)#text: ⏎',
		'[8:1]>[8:8](80,87)html: </html>',
		'[8:8]>[9:1](87,88)#text: ⏎',
	]);
});

it('Attributes', () => {
	const ast = parse('<CustomComponent prop1 prop2="value2" prop3={value3}></CustomComponent>');
	const map = nodeListToDebugMaps(ast.nodeList, true);
	expect(map).toEqual([
		'[1:1]>[1:54](0,53)CustomComponent: <CustomComponent␣prop1␣prop2="value2"␣prop3={value3}>',
		'[1:18]>[1:23](17,22)prop1: prop1',
		'  [1:17]>[1:18](16,17)bN: ␣',
		'  [1:18]>[1:23](17,22)name: prop1',
		'  [1:23]>[1:23](22,22)bE: ',
		'  [1:23]>[1:23](22,22)equal: ',
		'  [1:23]>[1:23](22,22)aE: ',
		'  [1:23]>[1:23](22,22)sQ: ',
		'  [1:23]>[1:23](22,22)value: ',
		'  [1:23]>[1:23](22,22)eQ: ',
		'  isDirective: false',
		'  isDynamicValue: false',
		'[1:24]>[1:38](23,37)prop2: prop2="value2"',
		'  [1:23]>[1:24](22,23)bN: ␣',
		'  [1:24]>[1:29](23,28)name: prop2',
		'  [1:29]>[1:29](28,28)bE: ',
		'  [1:29]>[1:30](28,29)equal: =',
		'  [1:30]>[1:30](29,29)aE: ',
		'  [1:30]>[1:31](29,30)sQ: "',
		'  [1:31]>[1:37](30,36)value: value2',
		'  [1:37]>[1:38](36,37)eQ: "',
		'  isDirective: false',
		'  isDynamicValue: false',
		'[1:39]>[1:53](38,52)prop3: prop3={value3}',
		'  [1:38]>[1:39](37,38)bN: ␣',
		'  [1:39]>[1:44](38,43)name: prop3',
		'  [1:44]>[1:44](43,43)bE: ',
		'  [1:44]>[1:45](43,44)equal: =',
		'  [1:45]>[1:45](44,44)aE: ',
		'  [1:45]>[1:46](44,45)sQ: {',
		'  [1:46]>[1:52](45,51)value: value3',
		'  [1:52]>[1:53](51,52)eQ: }',
		'  isDirective: false',
		'  isDynamicValue: true',
		'[1:54]>[1:72](53,71)CustomComponent: </CustomComponent>',
	]);
});

it('CustomComponent', () => {
	const ast = parse('<CustomComponent />');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual(['[1:1]>[1:20](0,19)CustomComponent: <CustomComponent␣/>']);
});

it('Doctype', () => {
	const ast = parse('<!doctype html>\n<html></html>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:16](0,15)#doctype: <!doctype␣html>',
		'[1:16]>[2:1](15,16)#text: ⏎',
		'[2:1]>[2:7](16,22)html: <html>',
		'[2:7]>[2:14](22,29)html: </html>',
	]);
});

it('namespace', () => {
	const doc = parse('<div><svg><text /></svg></div>');
	expect(doc.nodeList[0].nodeName).toBe('div');
	expect((doc.nodeList[0] as MLASTElement).namespace).toBe('http://www.w3.org/1999/xhtml');
	expect(doc.nodeList[1].nodeName).toBe('svg');
	expect((doc.nodeList[1] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc.nodeList[2].nodeName).toBe('text');
	expect((doc.nodeList[2] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');

	const doc2 = parse('<svg><foreignObject><div></div></foreignObject></svg>');
	expect(doc2.nodeList[0].nodeName).toBe('svg');
	expect((doc2.nodeList[0] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc2.nodeList[1].nodeName).toBe('foreignObject');
	expect((doc2.nodeList[1] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc2.nodeList[2].nodeName).toBe('div');
	expect((doc2.nodeList[2] as MLASTElement).namespace).toBe('http://www.w3.org/1999/xhtml');
});

describe('Issue', () => {
	test('#549', () => {
		const ast = parse(`<ul>{
	list.map(() => <li></li>)
}</ul>`);
		const map = nodeListToDebugMaps(ast.nodeList);
		expect(map).toEqual([
			'[1:1]>[1:5](0,4)ul: <ul>',
			'[1:5]>[2:17](4,22)MustacheTag: {⏎→list.map(()␣=>␣',
			'[2:17]>[2:21](22,26)li: <li>',
			'[2:21]>[2:26](26,31)li: </li>',
			'[2:26]>[3:2](31,34)MustacheTag: )⏎}',
			'[3:2]>[3:7](34,39)ul: </ul>',
		]);
	});
});
