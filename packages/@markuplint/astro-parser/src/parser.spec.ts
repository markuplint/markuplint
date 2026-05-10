// @ts-nocheck

import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

test('Basic', () => {
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
		'[1:1]>[3:4](0,29)#ps:Frontmatter: ---⏎const␣name␣=␣"World";⏎---',
		'[3:4]>[4:1](29,30)#text: ⏎',
		'[4:1]>[4:17](30,46)#comment: <!--␣Comment␣-->',
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
		'[10:51]>[10:57](138,144)#ps:MustacheTag: {name}',
		'[10:57]>[10:58](144,145)#text: !',
		'[10:58]>[10:64](145,151)div: </div>',
		'[10:64]>[11:1](151,152)#text: ⏎',
		'[11:1]>[11:5](152,156)ul: <ul>',
		'[11:5]>[12:1](156,157)#text: ⏎',
		'[12:1]>[12:19](157,175)#ps:MustacheTag (each): {list.map(item␣=>␣',
		'[12:19]>[12:23](175,179)li: <li>',
		'[12:23]>[12:29](179,185)#ps:MustacheTag: {item}',
		'[12:29]>[12:34](185,190)li: </li>',
		'[12:34]>[12:36](190,192)#ps:MustacheTag (end): )}',
		'[12:36]>[13:1](192,193)#text: ⏎',
		'[13:1]>[13:6](193,198)ul: </ul>',
		'[13:6]>[14:1](198,199)#text: ⏎',
	]);
});

test('CRLF', () => {
	const ast = parse(
		`---
const name = "World";
---
<style
>
div {
    color: red;
}
</style>
<ul  data-dynamic
=
{
	value
}>
{list.map(item =>
	<li
	>{item}</li
	>
)}
</ul>`.replaceAll('\n', '\r\n'),
	);
	const map = nodeListToDebugMaps(ast.nodeList, true);
	expect(map).toEqual([
		'[1:1]>[3:4](0,31)#ps:Frontmatter: ---␣⏎const␣name␣=␣"World";␣⏎---',
		'[4:1]>[5:2](33,42)style: <style␣⏎>',
		'[9:1]>[9:9](71,79)style: </style>',
		'[9:9]>[10:1](79,81)#text: ␣⏎',
		'[10:1]>[14:3](81,116)ul: <ul␣␣data-dynamic␣⏎=␣⏎{␣⏎→value␣⏎}>',
		'[10:6]>[14:2](86,115)data-dynamic: data-dynamic␣⏎=␣⏎{␣⏎→value␣⏎}',
		'  [10:4]>[10:6](84,86)bN: ␣␣',
		'  [10:6]>[10:18](86,98)name: data-dynamic',
		'  [10:18]>[11:1](98,100)bE: ␣⏎',
		'  [11:1]>[11:2](100,101)equal: =',
		'  [11:2]>[12:1](101,103)aE: ␣⏎',
		'  [12:1]>[12:2](103,104)sQ: {',
		'  [12:2]>[14:1](104,114)value: ␣⏎→value␣⏎',
		'  [14:1]>[14:2](114,115)eQ: }',
		'  isDirective: false',
		'  isDynamicValue: true',
		'[14:3]>[15:1](116,118)#text: ␣⏎',
		'[15:1]>[16:2](118,138)#ps:MustacheTag (each): {list.map(item␣=>␣⏎→',
		'[16:2]>[17:3](138,145)li: <li␣⏎→>',
		'[17:3]>[17:9](145,151)#ps:MustacheTag: {item}',
		'[17:9]>[18:3](151,159)li: </li␣⏎→>',
		'[18:3]>[19:3](159,163)#ps:MustacheTag (end): ␣⏎)}',
		'[19:3]>[20:1](163,165)#text: ␣⏎',
		'[20:1]>[20:6](165,170)ul: </ul>',
	]);
});

test('HTML', () => {
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

test('Attributes', () => {
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

test('CustomComponent', () => {
	const ast = parse('<CustomComponent />');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual(['[1:1]>[1:20](0,19)CustomComponent: <CustomComponent␣/>']);
});

test('Siblings', () => {
	const ast = parse('<tag1 /><tag2 /><tag3 />');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:9](0,8)tag1: <tag1␣/>',
		'[1:9]>[1:17](8,16)tag2: <tag2␣/>',
		'[1:17]>[1:25](16,24)tag3: <tag3␣/>',
	]);
});

test('Siblings2', () => {
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

test('Pair', () => {
	const doc1 = parse('<tag1></tag1>');
	expect(doc1.nodeList.find(n => n.uuid === doc1.nodeList[0].pairNodeUuid)?.raw).toBe('</tag1>');
	const doc2 = parse('<tag1><tag2 /></tag1>');
	expect(doc2.nodeList[1].pairNodeUuid).toBeNull();
	const doc3 = parse('<tag1><tag2></tag2></tag1>');
	expect(doc3.nodeList.find(n => n.uuid === doc3.nodeList[1].pairNodeUuid)?.raw).toBe('</tag2>');
});

test('Missing end tag (HTML)', () => {
	const ast = parse('<div><span><span /></div>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:6](0,5)div: <div>',
		'[1:6]>[1:12](5,11)span: <span>',
		'[1:12]>[1:20](11,19)span: <span␣/>',
		'[1:20]>[1:26](19,25)div: </div>',
	]);
});

test('Missing end tag (Component)', () => {
	const ast = parse('<XDiv><XSpan><XSpan /></XDiv>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:7](0,6)XDiv: <XDiv>',
		'[1:7]>[1:14](6,13)XSpan: <XSpan>',
		'[1:14]>[1:23](13,22)XSpan: <XSpan␣/>',
		'[1:23]>[1:30](22,29)XDiv: </XDiv>',
	]);
});

test('Doctype', () => {
	const ast = parse('<!doctype html>\n<html></html>');
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[1:16](0,15)#doctype: <!doctype␣html>',
		'[1:16]>[2:1](15,16)#text: ⏎',
		'[2:1]>[2:7](16,22)html: <html>',
		'[2:7]>[2:14](22,29)html: </html>',
	]);
});

test('Shorthand and spread', () => {
	const ast = parse('<div {a} {...b} />');
	const map = nodeListToDebugMaps(ast.nodeList, true);
	expect(map).toEqual([
		'[1:1]>[1:19](0,18)div: <div␣{a}␣{...b}␣/>',
		'[1:6]>[1:9](5,8)a: {a}',
		'  [1:5]>[1:6](4,5)bN: ␣',
		'  [1:6]>[1:6](5,5)name: ',
		'  [1:6]>[1:6](5,5)bE: ',
		'  [1:6]>[1:6](5,5)equal: ',
		'  [1:6]>[1:6](5,5)aE: ',
		'  [1:6]>[1:7](5,6)sQ: {',
		'  [1:7]>[1:8](6,7)value: a',
		'  [1:8]>[1:9](7,8)eQ: }',
		'  isDirective: false',
		'  isDynamicValue: true',
		'  potentialName: a',
		'[1:10]>[1:16](9,15)#spread: {...b}',
		'  #spread: {...b}',
	]);
});

test('namespace', () => {
	const doc = parse('<div><svg><text /></svg></div>');
	expect(doc.nodeList[0].nodeName).toBe('div');
	expect(doc.nodeList[0].namespace).toBe('http://www.w3.org/1999/xhtml');
	expect(doc.nodeList[1].nodeName).toBe('svg');
	expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc.nodeList[2].nodeName).toBe('text');
	expect(doc.nodeList[2].namespace).toBe('http://www.w3.org/2000/svg');

	const doc2 = parse('<svg><foreignObject><div></div></foreignObject></svg>');
	expect(doc2.nodeList[0].nodeName).toBe('svg');
	expect(doc2.nodeList[0].namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc2.nodeList[1].nodeName).toBe('foreignObject');
	expect(doc2.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
	expect(doc2.nodeList[2].nodeName).toBe('div');
	expect(doc2.nodeList[2].namespace).toBe('http://www.w3.org/1999/xhtml');
});

test('frontmatter', () => {
	const ast = parse(`---
// Example: <SomeComponent greeting="(Optional) Hello" name="Required Name" />
const { greeting = 'Hello', name } = Astro.props;
---
<div>
    <h1>{greeting}, {name}!</h1>
</div>`);
	const map = nodeListToDebugMaps(ast.nodeList);
	expect(map).toEqual([
		'[1:1]>[4:4](0,136)#ps:Frontmatter: ---⏎//␣Example:␣<SomeComponent␣greeting="(Optional)␣Hello"␣name="Required␣Name"␣/>⏎const␣{␣greeting␣=␣\'Hello\',␣name␣}␣=␣Astro.props;⏎---',
		'[4:4]>[5:1](136,137)#text: ⏎',
		'[5:1]>[5:6](137,142)div: <div>',
		'[5:6]>[6:5](142,147)#text: ⏎␣␣␣␣',
		'[6:5]>[6:9](147,151)h1: <h1>',
		'[6:9]>[6:19](151,161)#ps:MustacheTag: {greeting}',
		'[6:19]>[6:21](161,163)#text: ,␣',
		'[6:21]>[6:27](163,169)#ps:MustacheTag: {name}',
		'[6:27]>[6:28](169,170)#text: !',
		'[6:28]>[6:33](170,175)h1: </h1>',
		'[6:33]>[7:1](175,176)#text: ⏎',
		'[7:1]>[7:7](176,182)div: </div>',
	]);
});

describe('Issue', () => {
	test('#549', () => {
		const ast = parse(`<ul>{
	list.map(() => <li></li>)
}</ul>`);
		const map = nodeListToDebugMaps(ast.nodeList);
		expect(map).toEqual([
			'[1:1]>[1:5](0,4)ul: <ul>',
			'[1:5]>[2:17](4,22)#ps:MustacheTag (each): {⏎→list.map(()␣=>␣',
			'[2:17]>[2:21](22,26)li: <li>',
			'[2:21]>[2:26](26,31)li: </li>',
			'[2:26]>[3:2](31,34)#ps:MustacheTag (end): )⏎}',
			'[3:2]>[3:7](34,39)ul: </ul>',
		]);
	});

	test('#575', () => {
		const ast = parse('<div class:list={["class-name"]}></div>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:34](0,33)div: <div␣class:list={["class-name"]}>',
			'[1:6]>[1:33](5,32)class: class:list={["class-name"]}',
			'  [1:5]>[1:6](4,5)bN: ␣',
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
			"[2:2]>[4:4](7,38)#ps:MustacheTag: {⏎→→type␣===␣'checkbox'␣?␣(⏎→→→",
			'[4:4]>[4:14](38,48)fieldset: <fieldset>',
			'[4:14]>[5:5](48,53)#text: ⏎→→→→',
			'[5:5]>[5:13](53,61)legend: <legend>',
			'[5:13]>[5:20](61,68)#ps:MustacheTag: {label}',
			'[5:20]>[5:29](68,77)legend: </legend>',
			'[5:29]>[6:5](77,82)#text: ⏎→→→→',
			'[6:5]>[6:10](82,87)div: <div>',
			'[6:10]>[7:6](87,93)#text: ⏎→→→→→',
			'[7:6]>[8:7](93,124)#ps:MustacheTag (each): {values.map((value)␣=>␣(⏎→→→→→→',
			'[8:7]>[8:14](124,131)label: <label>',
			'[8:14]>[9:8](131,139)#text: ⏎→→→→→→→',
			'[9:8]>[9:47](139,178)input: <input␣type="checkbox"␣value={value}␣/>',
			'[9:15]>[9:30](146,161)type: type="checkbox"',
			'  [9:14]>[9:15](145,146)bN: ␣',
			'  [9:15]>[9:19](146,150)name: type',
			'  [9:19]>[9:19](150,150)bE: ',
			'  [9:19]>[9:20](150,151)equal: =',
			'  [9:20]>[9:20](151,151)aE: ',
			'  [9:20]>[9:21](151,152)sQ: "',
			'  [9:21]>[9:29](152,160)value: checkbox',
			'  [9:29]>[9:30](160,161)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[9:31]>[9:44](162,175)value: value={value}',
			'  [9:30]>[9:31](161,162)bN: ␣',
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
			'[10:14]>[10:21](192,199)#ps:MustacheTag: {value}',
			'[10:21]>[10:28](199,206)span: </span>',
			'[10:28]>[11:7](206,213)#text: ⏎→→→→→→',
			'[11:7]>[11:15](213,221)label: </label>',
			'[11:15]>[12:9](221,230)#ps:MustacheTag (end): ⏎→→→→→))}',
			'[12:9]>[13:5](230,235)#text: ⏎→→→→',
			'[13:5]>[13:11](235,241)div: </div>',
			'[13:11]>[14:4](241,245)#text: ⏎→→→',
			'[14:4]>[14:15](245,256)fieldset: </fieldset>',
			'[16:4]>[16:11](268,275)label: <label>',
			'[16:11]>[17:5](275,280)#text: ⏎→→→→',
			'[17:5]>[17:11](280,286)span: <span>',
			'[17:11]>[17:18](286,293)#ps:MustacheTag: {label}',
			'[17:18]>[17:25](293,300)span: </span>',
			'[17:25]>[18:5](300,305)#text: ⏎→→→→',
			"[18:5]>[18:28](305,328)#ps:MustacheTag: {type␣===␣'textarea'␣?␣",
			'[18:28]>[18:40](328,340)textarea: <textarea␣/>',
			'[18:43]>[18:64](343,364)input: <input␣type={type}␣/>',
			'[18:50]>[18:61](350,361)type: type={type}',
			'  [18:49]>[18:50](349,350)bN: ␣',
			'  [18:50]>[18:54](350,354)name: type',
			'  [18:54]>[18:54](354,354)bE: ',
			'  [18:54]>[18:55](354,355)equal: =',
			'  [18:55]>[18:55](355,355)aE: ',
			'  [18:55]>[18:56](355,356)sQ: {',
			'  [18:56]>[18:60](356,360)value: type',
			'  [18:60]>[18:61](360,361)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[18:43]>[18:65](343,365)#ps:MustacheTag: <input␣type={type}␣/>}',
			'[18:65]>[19:4](365,369)#text: ⏎→→→',
			'[19:4]>[19:12](369,377)label: </label>',
			'[19:12]>[21:3](377,384)#ps:MustacheTag: ⏎→→)⏎→}',
			'[21:3]>[22:1](384,385)#text: ⏎',
			'[22:1]>[22:7](385,391)div: </div>',
			'[22:7]>[23:1](391,392)#text: ⏎',
		]);
	});

	test('#803', () => {
		const ast = parse(`<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Title</title>
		<meta name="viewport" content="width=device-width" />
	</head>
</html>`);
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:17](0,16)html: <html␣lang="en">',
			'[1:7]>[1:16](6,15)lang: lang="en"',
			'  [1:6]>[1:7](5,6)bN: ␣',
			'  [1:7]>[1:11](6,10)name: lang',
			'  [1:11]>[1:11](10,10)bE: ',
			'  [1:11]>[1:12](10,11)equal: =',
			'  [1:12]>[1:12](11,11)aE: ',
			'  [1:12]>[1:13](11,12)sQ: "',
			'  [1:13]>[1:15](12,14)value: en',
			'  [1:15]>[1:16](14,15)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[1:17]>[2:2](16,18)#text: ⏎→',
			'[2:2]>[2:8](18,24)head: <head>',
			'[2:8]>[3:3](24,27)#text: ⏎→→',
			'[3:3]>[3:27](27,51)meta: <meta␣charset="utf-8"␣/>',
			'[3:9]>[3:24](33,48)charset: charset="utf-8"',
			'  [3:8]>[3:9](32,33)bN: ␣',
			'  [3:9]>[3:16](33,40)name: charset',
			'  [3:16]>[3:16](40,40)bE: ',
			'  [3:16]>[3:17](40,41)equal: =',
			'  [3:17]>[3:17](41,41)aE: ',
			'  [3:17]>[3:18](41,42)sQ: "',
			'  [3:18]>[3:23](42,47)value: utf-8',
			'  [3:23]>[3:24](47,48)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[3:27]>[4:3](51,54)#text: ⏎→→',
			'[4:3]>[4:10](54,61)title: <title>',
			'[4:10]>[4:15](61,66)#text: Title',
			'[4:15]>[4:23](66,74)title: </title>',
			'[4:23]>[5:3](74,77)#text: ⏎→→',
			'[5:3]>[5:56](77,130)meta: <meta␣name="viewport"␣content="width=device-width"␣/>',
			'[5:9]>[5:24](83,98)name: name="viewport"',
			'  [5:8]>[5:9](82,83)bN: ␣',
			'  [5:9]>[5:13](83,87)name: name',
			'  [5:13]>[5:13](87,87)bE: ',
			'  [5:13]>[5:14](87,88)equal: =',
			'  [5:14]>[5:14](88,88)aE: ',
			'  [5:14]>[5:15](88,89)sQ: "',
			'  [5:15]>[5:23](89,97)value: viewport',
			'  [5:23]>[5:24](97,98)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[5:25]>[5:53](99,127)content: content="width=device-width"',
			'  [5:24]>[5:25](98,99)bN: ␣',
			'  [5:25]>[5:32](99,106)name: content',
			'  [5:32]>[5:32](106,106)bE: ',
			'  [5:32]>[5:33](106,107)equal: =',
			'  [5:33]>[5:33](107,107)aE: ',
			'  [5:33]>[5:34](107,108)sQ: "',
			'  [5:34]>[5:52](108,126)value: width=device-width',
			'  [5:52]>[5:53](126,127)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[5:56]>[6:2](130,132)#text: ⏎→',
			'[6:2]>[6:9](132,139)head: </head>',
			'[6:9]>[7:1](139,140)#text: ⏎',
			'[7:1]>[7:8](140,147)html: </html>',
		]);

		const ast2 = parse(`<html>
	<head>
		<meta attr=">" />
		<meta attr={a>b} />
		<meta attr={<tag>text</tag>} />
	</head>
</html>`);
		const map2 = nodeListToDebugMaps(ast2.nodeList, true);
		expect(map2).toEqual([
			'[1:1]>[1:7](0,6)html: <html>',
			'[1:7]>[2:2](6,8)#text: ⏎→',
			'[2:2]>[2:8](8,14)head: <head>',
			'[2:8]>[3:3](14,17)#text: ⏎→→',
			'[3:3]>[3:20](17,34)meta: <meta␣attr=">"␣/>',
			'[3:9]>[3:17](23,31)attr: attr=">"',
			'  [3:8]>[3:9](22,23)bN: ␣',
			'  [3:9]>[3:13](23,27)name: attr',
			'  [3:13]>[3:13](27,27)bE: ',
			'  [3:13]>[3:14](27,28)equal: =',
			'  [3:14]>[3:14](28,28)aE: ',
			'  [3:14]>[3:15](28,29)sQ: "',
			'  [3:15]>[3:16](29,30)value: >',
			'  [3:16]>[3:17](30,31)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[3:20]>[4:3](34,37)#text: ⏎→→',
			'[4:3]>[4:22](37,56)meta: <meta␣attr={a>b}␣/>',
			'[4:9]>[4:19](43,53)attr: attr={a>b}',
			'  [4:8]>[4:9](42,43)bN: ␣',
			'  [4:9]>[4:13](43,47)name: attr',
			'  [4:13]>[4:13](47,47)bE: ',
			'  [4:13]>[4:14](47,48)equal: =',
			'  [4:14]>[4:14](48,48)aE: ',
			'  [4:14]>[4:15](48,49)sQ: {',
			'  [4:15]>[4:18](49,52)value: a>b',
			'  [4:18]>[4:19](52,53)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[4:22]>[5:3](56,59)#text: ⏎→→',
			'[5:3]>[5:34](59,90)meta: <meta␣attr={<tag>text</tag>}␣/>',
			'[5:9]>[5:31](65,87)attr: attr={<tag>text</tag>}',
			'  [5:8]>[5:9](64,65)bN: ␣',
			'  [5:9]>[5:13](65,69)name: attr',
			'  [5:13]>[5:13](69,69)bE: ',
			'  [5:13]>[5:14](69,70)equal: =',
			'  [5:14]>[5:14](70,70)aE: ',
			'  [5:14]>[5:15](70,71)sQ: {',
			'  [5:15]>[5:30](71,86)value: <tag>text</tag>',
			'  [5:30]>[5:31](86,87)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[5:34]>[6:2](90,92)#text: ⏎→',
			'[6:2]>[6:9](92,99)head: </head>',
			'[6:9]>[7:1](99,100)#text: ⏎',
			'[7:1]>[7:8](100,107)html: </html>',
		]);
	});

	test('#1377', () => {
		expect(
			nodeListToDebugMaps(
				parse("<div class={'group @container py-[calc(58/16*1rem)] rounded ' + theme}></div>").nodeList,
			),
		).toStrictEqual([
			"[1:1]>[1:72](0,71)div: <div␣class={'group␣@container␣py-[calc(58/16*1rem)]␣rounded␣'␣+␣theme}>",
			'[1:72]>[1:78](71,77)div: </div>',
		]);
	});

	test('#1432', () => {
		expect(nodeListToDebugMaps(parse('<div style={{ a: b }}></div>').nodeList, true)).toStrictEqual([
			'[1:1]>[1:23](0,22)div: <div␣style={{␣a:␣b␣}}>',
			'[1:6]>[1:22](5,21)style: style={{␣a:␣b␣}}',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:11](5,10)name: style',
			'  [1:11]>[1:11](10,10)bE: ',
			'  [1:11]>[1:12](10,11)equal: =',
			'  [1:12]>[1:12](11,11)aE: ',
			'  [1:12]>[1:13](11,12)sQ: {',
			'  [1:13]>[1:21](12,20)value: {␣a:␣b␣}',
			'  [1:21]>[1:22](20,21)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:23]>[1:29](22,28)div: </div>',
		]);
	});

	test('#1451', () => {
		expect(parse('<div></div>').nodeList[0].elementType).toBe('html');
		expect(parse('<x-div></x-div>').nodeList[0].elementType).toBe('web-component');
		expect(parse('<Div></Div>').nodeList[0].elementType).toBe('authored');
	});

	test('#1562', () => {
		// https://docs.astro.build/en/basics/astro-syntax/#fragments
		const ast = parse('<>text</>');
		const map = nodeListToDebugMaps(ast.nodeList);
		expect(map).toEqual([
			'[1:1]>[1:3](0,2)#jsx-fragment: <>',
			'[1:3]>[1:7](2,6)#text: text',
			'[1:7]>[1:10](6,9)#jsx-fragment: </>',
		]);
	});

	test('#1561', () => {
		const ast = parse(`
<p title="Today is '24/04/01">text</p>
<p title="Today is &#39;24/04/01">text</p>
`);
		expect(ast).toBeTruthy();
	});

	describe('#3823 script tag diagnostics are not fatal', () => {
		test('script type="module" parses to a script element', () => {
			const ast = parse('<script type="module">console.log("hello");</script>');
			expect(ast.parseError).toBeUndefined();
			const map = nodeListToDebugMaps(ast.nodeList);
			expect(map[0]).toBe('[1:1]>[1:23](0,22)script: <script␣type="module">');
		});

		test('script defer parses to a script element', () => {
			const ast = parse('<script defer>console.log("hello");</script>');
			expect(ast.parseError).toBeUndefined();
			const map = nodeListToDebugMaps(ast.nodeList);
			expect(map[0]).toBe('[1:1]>[1:15](0,14)script: <script␣defer>');
		});

		test('script with data-* attribute parses to a script element', () => {
			const ast = parse('<script data-widget="example">console.log("hello");</script>');
			expect(ast.parseError).toBeUndefined();
			const map = nodeListToDebugMaps(ast.nodeList);
			expect(map[0]).toBe('[1:1]>[1:31](0,30)script: <script␣data-widget="example">');
		});

		test('script with define:vars parses to a script element', () => {
			const ast = parse('<script define:vars={{ foo: 1 }}>console.log(foo);</script>');
			expect(ast.parseError).toBeUndefined();
			const map = nodeListToDebugMaps(ast.nodeList);
			expect(map[0]).toBe('[1:1]>[1:34](0,33)script: <script␣define:vars={{␣foo:␣1␣}}>');
		});
	});

	describe('#3856 spread attribute parsing (v5 mirror of #3824)', () => {
		const findStartTag = (ast: any) => ast.nodeList.find((n: any) => n.type === 'starttag');

		test('TypeScript assertion in spread attribute', () => {
			const ast = parse(
				'<button type="button" {...{ command: "close" } as any} commandfor="dialog-id">close</button>',
			);
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...{ command: "close" } as any}');
			const attrNames = start.attributes.filter((a: any) => a.type === 'attr').map((a: any) => a.nodeName);
			expect(attrNames).toEqual(['type', 'commandfor']);
		});

		test('spread attribute with expression child on same element', () => {
			const ast = parse('<div {...props}>{label}</div>');
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...props}');
		});

		test('dynamic tag (PascalCase) with spread + expression child', () => {
			const ast = parse('<ContainerTag class="container" {...containerProps}>{title}</ContainerTag>');
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...containerProps}');
		});

		test('textarea with conditional spread + expression child', () => {
			const ast = parse(
				"<textarea {...fieldSizingContent ? { 'data-field-sizing': 'content' } : {}}>{value}</textarea>",
			);
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe("{...fieldSizingContent ? { 'data-field-sizing': 'content' } : {}}");
		});

		test('multiple spread attributes on dynamic tag with expression child', () => {
			const ast = parse(`<Element
  {...iconOnly ? { title: label } : {}}
  {...rest}
>
  {label}
</Element>`);
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(2);
			expect(spreads[0].raw).toBe('{...iconOnly ? { title: label } : {}}');
			expect(spreads[1].raw).toBe('{...rest}');
		});

		test('component with conditional spread and descendant expression child', () => {
			const ast = parse(`<Comp {...enabled ? { title: title } : {}}>
  <div>{title}</div>
</Comp>`);
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...enabled ? { title: title } : {}}');
		});

		test('static spread + text child still works (regression guard)', () => {
			const ast = parse('<div {...props}>text</div>');
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...props}');
		});

		test('simple spread shorthand still works (regression guard)', () => {
			const ast = parse('<div {a} {...b} />');
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...b}');
		});

		test('multi-line spread reports correct line, column, and offset', () => {
			const ast = parse('<Element\n  {...rest}\n/>');
			const start = findStartTag(ast);
			const spread = start.attributes.find((a: any) => a.type === 'spread');
			expect(spread.line).toBe(2);
			expect(spread.col).toBe(3);
			expect(spread.offset).toBe(11);
			expect(spread.raw).toBe('{...rest}');
		});

		test('CRLF line endings preserve correct line, column, and offset', () => {
			const ast = parse('<Element\r\n  {...rest}\r\n/>');
			const start = findStartTag(ast);
			const spread = start.attributes.find((a: any) => a.type === 'spread');
			expect(spread.line).toBe(2);
			expect(spread.col).toBe(3);
			expect(spread.raw).toBe('{...rest}');
		});

		test('spread attribute on component with block-behavior expression child (dev-specific)', () => {
			// Guards the interaction between the new spread pre-pass (#3856) and
			// dev's `detectBlockBehavior()` for `.map()` expression children.
			const ast = parse('<Comp {...rest}>{list.map(item => <li>{item}</li>)}</Comp>');
			expect(ast.parseError).toBeUndefined();
			const start = findStartTag(ast);
			const spreads = start.attributes.filter((a: any) => a.type === 'spread');
			expect(spreads).toHaveLength(1);
			expect(spreads[0].raw).toBe('{...rest}');
			const debugMaps = nodeListToDebugMaps(ast.nodeList);
			expect(debugMaps.some(line => line.includes('#ps:MustacheTag (each)'))).toBe(true);
		});
	});
});

describe('Directives', () => {
	test('server:defer (Astro v5)', () => {
		const ast = parse('<Component server:defer />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:27](0,26)Component: <Component␣server:defer␣/>',
			'[1:12]>[1:24](11,23)server:defer: server:defer',
			'  [1:11]>[1:12](10,11)bN: ␣',
			'  [1:12]>[1:24](11,23)name: server:defer',
			'  [1:24]>[1:24](23,23)bE: ',
			'  [1:24]>[1:24](23,23)equal: ',
			'  [1:24]>[1:24](23,23)aE: ',
			'  [1:24]>[1:24](23,23)sQ: ',
			'  [1:24]>[1:24](23,23)value: ',
			'  [1:24]>[1:24](23,23)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
		]);
	});

	test('client:load', () => {
		const ast = parse('<Component client:load />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:26](0,25)Component: <Component␣client:load␣/>',
			'[1:12]>[1:23](11,22)client:load: client:load',
			'  [1:11]>[1:12](10,11)bN: ␣',
			'  [1:12]>[1:23](11,22)name: client:load',
			'  [1:23]>[1:23](22,22)bE: ',
			'  [1:23]>[1:23](22,22)equal: ',
			'  [1:23]>[1:23](22,22)aE: ',
			'  [1:23]>[1:23](22,22)sQ: ',
			'  [1:23]>[1:23](22,22)value: ',
			'  [1:23]>[1:23](22,22)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
		]);
	});

	test('client:only', () => {
		const ast = parse('<Component client:only="react" />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:34](0,33)Component: <Component␣client:only="react"␣/>',
			'[1:12]>[1:31](11,30)client:only: client:only="react"',
			'  [1:11]>[1:12](10,11)bN: ␣',
			'  [1:12]>[1:23](11,22)name: client:only',
			'  [1:23]>[1:23](22,22)bE: ',
			'  [1:23]>[1:24](22,23)equal: =',
			'  [1:24]>[1:24](23,23)aE: ',
			'  [1:24]>[1:25](23,24)sQ: "',
			'  [1:25]>[1:30](24,29)value: react',
			'  [1:30]>[1:31](29,30)eQ: "',
			'  isDirective: true',
			'  isDynamicValue: false',
		]);
	});

	test('set:html', () => {
		const ast = parse('<div set:html={rawHTML} />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:27](0,26)div: <div␣set:html={rawHTML}␣/>',
			'[1:6]>[1:24](5,23)set:html: set:html={rawHTML}',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:14](5,13)name: set:html',
			'  [1:14]>[1:14](13,13)bE: ',
			'  [1:14]>[1:15](13,14)equal: =',
			'  [1:15]>[1:15](14,14)aE: ',
			'  [1:15]>[1:16](14,15)sQ: {',
			'  [1:16]>[1:23](15,22)value: rawHTML',
			'  [1:23]>[1:24](22,23)eQ: }',
			'  isDirective: true',
			'  isDynamicValue: true',
		]);
	});

	test('set:text', () => {
		const ast = parse('<div set:text={text} />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:24](0,23)div: <div␣set:text={text}␣/>',
			'[1:6]>[1:21](5,20)set:text: set:text={text}',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:14](5,13)name: set:text',
			'  [1:14]>[1:14](13,13)bE: ',
			'  [1:14]>[1:15](13,14)equal: =',
			'  [1:15]>[1:15](14,14)aE: ',
			'  [1:15]>[1:16](14,15)sQ: {',
			'  [1:16]>[1:20](15,19)value: text',
			'  [1:20]>[1:21](19,20)eQ: }',
			'  isDirective: true',
			'  isDynamicValue: true',
		]);
	});

	test('is:inline', () => {
		const ast = parse('<script is:inline>console.log("hello")</script>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:19](0,18)script: <script␣is:inline>',
			'[1:9]>[1:18](8,17)is:inline: is:inline',
			'  [1:8]>[1:9](7,8)bN: ␣',
			'  [1:9]>[1:18](8,17)name: is:inline',
			'  [1:18]>[1:18](17,17)bE: ',
			'  [1:18]>[1:18](17,17)equal: ',
			'  [1:18]>[1:18](17,17)aE: ',
			'  [1:18]>[1:18](17,17)sQ: ',
			'  [1:18]>[1:18](17,17)value: ',
			'  [1:18]>[1:18](17,17)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
			'[1:39]>[1:48](38,47)script: </script>',
		]);
	});

	test('is:raw treats child content as raw text (not parsed HTML)', () => {
		const ast = parse('<div is:raw><span>{text}</span></div>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:13](0,12)div: <div␣is:raw>',
			'[1:6]>[1:12](5,11)is:raw: is:raw',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:12](5,11)name: is:raw',
			'  [1:12]>[1:12](11,11)bE: ',
			'  [1:12]>[1:12](11,11)equal: ',
			'  [1:12]>[1:12](11,11)aE: ',
			'  [1:12]>[1:12](11,11)sQ: ',
			'  [1:12]>[1:12](11,11)value: ',
			'  [1:12]>[1:12](11,11)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
			'[1:13]>[1:32](12,31)#text: <span>{text}</span>',
			'[1:32]>[1:38](31,37)div: </div>',
		]);
	});

	test('define:vars', () => {
		const ast = parse('<style define:vars={{ color }}>div { color: var(--color); }</style>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:32](0,31)style: <style␣define:vars={{␣color␣}}>',
			'[1:8]>[1:31](7,30)define:vars: define:vars={{␣color␣}}',
			'  [1:7]>[1:8](6,7)bN: ␣',
			'  [1:8]>[1:19](7,18)name: define:vars',
			'  [1:19]>[1:19](18,18)bE: ',
			'  [1:19]>[1:20](18,19)equal: =',
			'  [1:20]>[1:20](19,19)aE: ',
			'  [1:20]>[1:21](19,20)sQ: {',
			'  [1:21]>[1:30](20,29)value: {␣color␣}',
			'  [1:30]>[1:31](29,30)eQ: }',
			'  isDirective: true',
			'  isDynamicValue: true',
			'[1:60]>[1:68](59,67)style: </style>',
		]);
	});

	test('transition:animate', () => {
		const ast = parse('<div transition:animate="slide">content</div>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:33](0,32)div: <div␣transition:animate="slide">',
			'[1:6]>[1:32](5,31)transition:animate: transition:animate="slide"',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:24](5,23)name: transition:animate',
			'  [1:24]>[1:24](23,23)bE: ',
			'  [1:24]>[1:25](23,24)equal: =',
			'  [1:25]>[1:25](24,24)aE: ',
			'  [1:25]>[1:26](24,25)sQ: "',
			'  [1:26]>[1:31](25,30)value: slide',
			'  [1:31]>[1:32](30,31)eQ: "',
			'  isDirective: true',
			'  isDynamicValue: false',
			'[1:33]>[1:40](32,39)#text: content',
			'[1:40]>[1:46](39,45)div: </div>',
		]);
	});

	test('multiple directives on same element', () => {
		const ast = parse('<Component client:visible set:html={content} />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:48](0,47)Component: <Component␣client:visible␣set:html={content}␣/>',
			'[1:12]>[1:26](11,25)client:visible: client:visible',
			'  [1:11]>[1:12](10,11)bN: ␣',
			'  [1:12]>[1:26](11,25)name: client:visible',
			'  [1:26]>[1:26](25,25)bE: ',
			'  [1:26]>[1:26](25,25)equal: ',
			'  [1:26]>[1:26](25,25)aE: ',
			'  [1:26]>[1:26](25,25)sQ: ',
			'  [1:26]>[1:26](25,25)value: ',
			'  [1:26]>[1:26](25,25)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
			'[1:27]>[1:45](26,44)set:html: set:html={content}',
			'  [1:26]>[1:27](25,26)bN: ␣',
			'  [1:27]>[1:35](26,34)name: set:html',
			'  [1:35]>[1:35](34,34)bE: ',
			'  [1:35]>[1:36](34,35)equal: =',
			'  [1:36]>[1:36](35,35)aE: ',
			'  [1:36]>[1:37](35,36)sQ: {',
			'  [1:37]>[1:44](36,43)value: content',
			'  [1:44]>[1:45](43,44)eQ: }',
			'  isDirective: true',
			'  isDynamicValue: true',
		]);
	});

	test('class:list is NOT a directive (special-cased to potentialName)', () => {
		// class: prefix is special-cased in visitAttr — isDirective stays false, potentialName is set
		const ast = parse('<div class:list={["a", "b"]} />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toContainEqual(expect.stringContaining('isDirective: false'));
		expect(map).toContainEqual(expect.stringContaining('potentialName: class'));
	});

	test('client:media with special characters in value', () => {
		const ast = parse('<Component client:media="(max-width: 600px)" />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:48](0,47)Component: <Component␣client:media="(max-width:␣600px)"␣/>',
			'[1:12]>[1:45](11,44)client:media: client:media="(max-width:␣600px)"',
			'  [1:11]>[1:12](10,11)bN: ␣',
			'  [1:12]>[1:24](11,23)name: client:media',
			'  [1:24]>[1:24](23,23)bE: ',
			'  [1:24]>[1:25](23,24)equal: =',
			'  [1:25]>[1:25](24,24)aE: ',
			'  [1:25]>[1:26](24,25)sQ: "',
			'  [1:26]>[1:44](25,43)value: (max-width:␣600px)',
			'  [1:44]>[1:45](43,44)eQ: "',
			'  isDirective: true',
			'  isDynamicValue: false',
		]);
	});

	test('arbitrary colon-separated attribute is treated as directive', () => {
		// Any prefix:name pattern triggers isDirective: true (catch-all in switch default)
		const ast = parse('<div custom:attr="val" />');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toContainEqual(expect.stringContaining('isDirective: true'));
		expect(map).toContainEqual(expect.stringContaining('name: custom:attr'));
	});
});
