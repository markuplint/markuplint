// @ts-nocheck

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
		'[1:1]>[4:1](0,30)#text: ␣␣␣⏎␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣␣⏎␣␣␣⏎',
		'[4:1]>[4:17](30,46)#comment: <!--␣Comment␣-->',
		'[4:17]>[5:1](46,47)#text: ⏎',
		'[5:1]>[5:8](47,54)style: <style>',
		'[9:1]>[9:9](79,87)style: </style>',
		'[9:9]>[10:1](87,88)#text: ⏎',
		'[10:1]>[10:45](88,132)div: <div␣data-attr="value"␣data-dynamic={value}>',
		'[10:6]>[10:23](93,110)data-attr: data-attr="value"',
		'  [10:6]>[10:6](93,93)bN: ',
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
		'  [10:24]>[10:24](111,111)bN: ',
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
		'  [1:18]>[1:18](17,17)bN: ',
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
		'  [1:24]>[1:24](23,23)bN: ',
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
		'  [1:39]>[1:39](38,38)bN: ',
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

it('Siblings', () => {
	const ast = parse('<tag1 /><tag2 /><tag3 />');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:9](0,8)tag1: <tag1␣/>',
		'[1:9]>[1:17](8,16)tag2: <tag2␣/>',
		'[1:17]>[1:25](16,24)tag3: <tag3␣/>',
	]);
});

it('Siblings2', () => {
	const ast = parse('<tag1></tag1><tag2 attr></tag2><tag3 attr2></tag3>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:7](0,6)tag1: <tag1>',
		'[1:7]>[1:14](6,13)tag1: </tag1>',
		'[1:14]>[1:25](13,24)tag2: <tag2␣attr>',
		'[1:25]>[1:32](24,31)tag2: </tag2>',
		'[1:32]>[1:44](31,43)tag3: <tag3␣attr2>',
		'[1:44]>[1:51](43,50)tag3: </tag3>',
	]);
});

it('Pear', () => {
	expect(parse('<tag1></tag1>').nodeList[0].pearNode?.raw).toBe('</tag1>');
	expect(parse('<tag1><tag2 /></tag1>').nodeList[1].pearNode?.raw).toBeUndefined();
	expect(parse('<tag1><tag2></tag2></tag1>').nodeList[1].pearNode?.raw).toBe('</tag2>');
});

it('Missing end tag', () => {
	const ast = parse('<div><span><span /></div>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:6](0,5)div: <div>',
		'[1:6]>[1:12](5,11)span: <span>',
		'[1:12]>[1:20](11,19)span: <span␣/>',
		'[1:20]>[1:26](19,25)#text: </div>',
	]);
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

	test('#575', () => {
		const ast = parse('<div class:list={["class-name"]}></div>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:34](0,33)div: <div␣class:list={["class-name"]}>',
			'[1:6]>[1:33](5,32)class: class:list={["class-name"]}',
			'  [1:6]>[1:6](5,5)bN: ',
			'  [1:6]>[1:16](5,15)name: class:list',
			'  [1:16]>[1:16](15,15)bE: ',
			'  [1:16]>[1:17](15,16)equal: =',
			'  [1:17]>[1:17](16,16)aE: ',
			'  [1:17]>[1:18](16,17)sQ: {',
			'  [1:18]>[1:32](17,31)value: ["class-name"]',
			'  [1:32]>[1:33](31,32)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  potentialName: class',
			'[1:34]>[1:40](33,39)div: </div>',
		]);
	});

	test('#739', () => {
		const ast = parse(`<div>
	{
		type === 'checkbox' ? (
			<fieldset>
				<legend>{label}</legend>
				<div>
					{values.map((value) => (
						<label>
							<input type="checkbox" value={value} />
							<span>{value}</span>
						</label>
					))}
				</div>
			</fieldset>
		) : (
			<label>
				<span>{label}</span>
				{type === 'textarea' ? <textarea /> : <input type={type} />}
			</label>
		)
	}
</div>
`);
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[2:2](5,7)#text: ⏎→',
			"[2:2]>[4:4](7,38)MustacheTag: {⏎→→type␣===␣'checkbox'␣?␣(⏎→→→",
			'[4:4]>[4:14](38,48)fieldset: <fieldset>',
			'[4:14]>[5:5](48,53)#text: ⏎→→→→',
			'[5:5]>[5:13](53,61)legend: <legend>',
			'[5:13]>[5:20](61,68)MustacheTag: {label}',
			'[5:20]>[5:29](68,77)legend: </legend>',
			'[5:29]>[6:5](77,82)#text: ⏎→→→→',
			'[6:5]>[6:10](82,87)div: <div>',
			'[6:10]>[7:6](87,93)#text: ⏎→→→→→',
			'[7:6]>[8:7](93,124)MustacheTag: {values.map((value)␣=>␣(⏎→→→→→→',
			'[8:7]>[8:14](124,131)label: <label>',
			'[8:14]>[9:8](131,139)#text: ⏎→→→→→→→',
			'[9:8]>[9:47](139,178)input: <input␣type="checkbox"␣value={value}␣/>',
			'[9:15]>[9:30](146,161)type: type="checkbox"',
			'  [9:15]>[9:15](146,146)bN: ',
			'  [9:15]>[9:19](146,150)name: type',
			'  [9:19]>[9:19](150,150)bE: ',
			'  [9:19]>[9:20](150,151)equal: =',
			'  [9:20]>[9:20](151,151)aE: ',
			'  [9:20]>[9:21](151,152)sQ: "',
			'  [9:21]>[9:29](152,160)value: checkbox',
			'  [9:29]>[9:30](160,161)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[9:31]>[9:45](162,176)value: value={value}␣',
			'  [9:31]>[9:31](162,162)bN: ',
			'  [9:31]>[9:36](162,167)name: value',
			'  [9:36]>[9:36](167,167)bE: ',
			'  [9:36]>[9:37](167,168)equal: =',
			'  [9:37]>[9:37](168,168)aE: ',
			'  [9:37]>[9:38](168,169)sQ: {',
			'  [9:38]>[9:43](169,174)value: value',
			'  [9:43]>[9:44](174,175)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[9:47]>[10:8](178,186)#text: ⏎→→→→→→→',
			'[10:8]>[10:14](186,192)span: <span>',
			'[10:14]>[10:21](192,199)MustacheTag: {value}',
			'[10:21]>[10:28](199,206)span: </span>',
			'[10:28]>[11:7](206,213)#text: ⏎→→→→→→',
			'[11:7]>[11:15](213,221)label: </label>',
			'[11:15]>[12:9](221,230)MustacheTag: ⏎→→→→→))}',
			'[12:9]>[13:5](230,235)#text: ⏎→→→→',
			'[13:5]>[13:11](235,241)div: </div>',
			'[13:11]>[14:4](241,245)#text: ⏎→→→',
			'[14:4]>[14:15](245,256)fieldset: </fieldset>',
			'[16:4]>[16:11](268,275)label: <label>',
			'[16:11]>[17:5](275,280)#text: ⏎→→→→',
			'[17:5]>[17:11](280,286)span: <span>',
			'[17:11]>[17:18](286,293)MustacheTag: {label}',
			'[17:18]>[17:25](293,300)span: </span>',
			'[17:25]>[18:5](300,305)#text: ⏎→→→→',
			"[18:5]>[18:28](305,328)MustacheTag: {type␣===␣'textarea'␣?␣",
			'[18:28]>[18:40](328,340)textarea: <textarea␣/>',
			'[18:43]>[18:64](343,364)input: <input␣type={type}␣/>',
			'[18:50]>[18:62](350,362)type: type={type}␣',
			'  [18:50]>[18:50](350,350)bN: ',
			'  [18:50]>[18:54](350,354)name: type',
			'  [18:54]>[18:54](354,354)bE: ',
			'  [18:54]>[18:55](354,355)equal: =',
			'  [18:55]>[18:55](355,355)aE: ',
			'  [18:55]>[18:56](355,356)sQ: {',
			'  [18:56]>[18:60](356,360)value: type',
			'  [18:60]>[18:61](360,361)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[18:43]>[18:65](343,365)MustacheTag: <input␣type={type}␣/>}',
			'[18:65]>[19:4](365,369)#text: ⏎→→→',
			'[19:4]>[19:12](369,377)label: </label>',
			'[19:12]>[21:3](377,384)MustacheTag: ⏎→→)⏎→}',
			'[21:3]>[22:1](384,385)#text: ⏎',
			'[22:1]>[22:7](385,391)div: </div>',
			'[22:7]>[23:1](391,392)#text: ⏎',
		]);
	});
});
