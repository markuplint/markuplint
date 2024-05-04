// @ts-nocheck

import { attributesToDebugMaps, nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('parse', () => {
	test('parse error', () => {
		expect(() => {
			parse('<div><sp</div>');
		}).toThrow('Identifier expected.');
	});

	test('parse error', () => {
		expect(() => {
			parse('<div><span></div>');
		}).toThrow("JSX element 'span' has no corresponding closing tag.");
	});

	test('Element only', () => {
		const ast = parse('<div></div>');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual(['[1:1]>[1:6](0,5)div: <div>', '[1:6]>[1:12](5,11)div: </div>']);
	});

	test('Fragment', () => {
		const ast = parse('<></>');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual(['[1:1]>[1:3](0,2)#jsx-fragment: <>', '[1:3]>[1:6](2,5)#jsx-fragment: </>']);
	});

	test('Nesting', () => {
		const ast = parse(`<div>
	<>
		<ul>
			<li>item</li>
			<li>item</li>
		</ul>
		<ol>
			<li>item</li>
			<li>item</li>
		</ol>
	</>
</div>`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[2:2](5,7)#text: ⏎→',
			'[2:2]>[2:4](7,9)#jsx-fragment: <>',
			'[2:4]>[3:3](9,12)#text: ⏎→→',
			'[3:3]>[3:7](12,16)ul: <ul>',
			'[3:7]>[4:4](16,20)#text: ⏎→→→',
			'[4:4]>[4:8](20,24)li: <li>',
			'[4:8]>[4:12](24,28)#text: item',
			'[4:12]>[4:17](28,33)li: </li>',
			'[4:17]>[5:4](33,37)#text: ⏎→→→',
			'[5:4]>[5:8](37,41)li: <li>',
			'[5:8]>[5:12](41,45)#text: item',
			'[5:12]>[5:17](45,50)li: </li>',
			'[5:17]>[6:3](50,53)#text: ⏎→→',
			'[6:3]>[6:8](53,58)ul: </ul>',
			'[6:8]>[7:3](58,61)#text: ⏎→→',
			'[7:3]>[7:7](61,65)ol: <ol>',
			'[7:7]>[8:4](65,69)#text: ⏎→→→',
			'[8:4]>[8:8](69,73)li: <li>',
			'[8:8]>[8:12](73,77)#text: item',
			'[8:12]>[8:17](77,82)li: </li>',
			'[8:17]>[9:4](82,86)#text: ⏎→→→',
			'[9:4]>[9:8](86,90)li: <li>',
			'[9:8]>[9:12](90,94)#text: item',
			'[9:12]>[9:17](94,99)li: </li>',
			'[9:17]>[10:3](99,102)#text: ⏎→→',
			'[10:3]>[10:8](102,107)ol: </ol>',
			'[10:8]>[11:2](107,109)#text: ⏎→',
			'[11:2]>[11:5](109,112)#jsx-fragment: </>',
			'[11:5]>[12:1](112,113)#text: ⏎',
			'[12:1]>[12:7](113,119)div: </div>',
		]);
	});

	test('Code', () => {
		const ast = parse('const El = <>item</>;const El2 = () => <>item2</>;');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:12]>[1:14](11,13)#jsx-fragment: <>',
			'[1:14]>[1:18](13,17)#text: item',
			'[1:18]>[1:21](17,20)#jsx-fragment: </>',
			'[1:40]>[1:42](39,41)#jsx-fragment: <>',
			'[1:42]>[1:47](41,46)#text: item2',
			'[1:47]>[1:50](46,49)#jsx-fragment: </>',
		]);
	});

	test('Children', () => {
		const ast = parse('<ul>{[1, 2, 3].map(item => (<li key={item}>{item}</li>))}</ul>');
		expect(ast.nodeList[0].nodeName).toBe('ul');
		expect(ast.nodeList[1].nodeName).toBe('#ps:JSXExpressionContainer');
		// @ts-ignore
		expect(ast.nodeList[1].childNodes[0].uuid).toBe(ast.nodeList[2].uuid);
		expect(ast.nodeList[2].parentNode?.uuid).toBe(ast.nodeList[1].uuid);
	});

	test('Code 2', () => {
		const ast = parse(`const Component = () => {
	return (
		<>
			<div className="foo" tabIndex="-1" tabindex="-1" aria-label="accname"></div>
			<img className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" />
		</>
	);
};`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[3:3]>[3:5](38,40)#jsx-fragment: <>',
			'[3:5]>[4:4](40,44)#text: ⏎→→→',
			'[4:4]>[4:74](44,114)div: <div␣className="foo"␣tabIndex="-1"␣tabindex="-1"␣aria-label="accname">',
			'[4:74]>[4:80](114,120)div: </div>',
			'[4:80]>[5:4](120,124)#text: ⏎→→→',
			'[5:4]>[5:76](124,196)img: <img␣className="foo"␣tabIndex="-1"␣tabindex="-1"␣aria-label="accname"␣/>',
			'[5:76]>[6:3](196,199)#text: ⏎→→',
			'[6:3]>[6:6](199,202)#jsx-fragment: </>',
		]);
	});

	test('Code 3', () => {
		const ast = parse(`const Component = () => {
	return (
		<ul>
			{[1, 2, 3].map(item => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
};`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[3:3]>[3:7](38,42)ul: <ul>',
			'[3:7]>[4:4](42,46)#text: ⏎→→→',
			'[4:4]>[6:7](46,108)#ps:JSXExpressionContainer: {[1,␣2,␣3].map(item␣=>␣(⏎→→→→<li␣key={item}>{item}</li>⏎→→→))}',
			'[5:5]>[5:20](75,90)li: <li␣key={item}>',
			'[5:20]>[5:26](90,96)#ps:JSXExpressionContainer: {item}',
			'[5:26]>[5:31](96,101)li: </li>',
			'[6:7]>[7:3](108,111)#text: ⏎→→',
			'[7:3]>[7:8](111,116)ul: </ul>',
		]);
	});

	test('Code 3 - Parent-child relationship', () => {
		const ast = parse(`const Component = () => {
	return (
		<ul>
			{[1, 2, 3].map(item => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
};`);
		// @ts-ignore
		expect(ast.nodeList[0].childNodes.length).toBe(3);
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].nodeName).toBe('#text');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[1].nodeName).toBe('#ps:JSXExpressionContainer');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[2].nodeName).toBe('#text');
		// @ts-ignore
		expect(ast.nodeList[2].parentNode?.uuid).toBe(ast.nodeList[0].uuid);
		expect(ast.nodeList[3].parentNode?.uuid).toBe(ast.nodeList[2].uuid);
	});

	test('Code 4', () => {
		const ast = parse('const Component = () => <Children prop={<PropElement />} />;');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:25]>[1:60](24,59)Children: <Children␣prop={<PropElement␣/>}␣/>',
			'[1:41]>[1:56](40,55)PropElement: <PropElement␣/>',
		]);
	});

	test('Code 4 - Parent-child relationship', () => {
		const ast = parse('const Component = () => <Children prop={<PropElement />} />;');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes.length).toBe(0);
		expect(ast.nodeList[1].parentNode).toBeNull();
	});

	test('Code 5', () => {
		const ast = parse(`const Component = {
	prop: () => <div>prop</div>,
	method () {
		return <div>method</div>
	}
};`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[2:14]>[2:19](33,38)div: <div>',
			'[2:19]>[2:23](38,42)#text: prop',
			'[2:23]>[2:29](42,48)div: </div>',
			'[4:10]>[4:15](72,77)div: <div>',
			'[4:15]>[4:21](77,83)#text: method',
			'[4:21]>[4:27](83,89)div: </div>',
		]);
	});

	test('Code 6', () => {
		const ast = parse(`class Component {
	prop = () => <div>prop</div>;
	method () {
		return <div>method</div>
	}
}`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[2:15]>[2:20](32,37)div: <div>',
			'[2:20]>[2:24](37,41)#text: prop',
			'[2:24]>[2:30](41,47)div: </div>',
			'[4:10]>[4:15](71,76)div: <div>',
			'[4:15]>[4:21](76,82)#text: method',
			'[4:21]>[4:27](82,88)div: </div>',
		]);
	});

	test('Code 7', () => {
		const ast = parse(`export default function () { return <div>default</div>; }
export function fn () { return <div>fn</div>; }
export const v = <div>v</div>;
export class C { render () { return <div>C</div>; } }`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:37]>[1:42](36,41)div: <div>',
			'[1:42]>[1:49](41,48)#text: default',
			'[1:49]>[1:55](48,54)div: </div>',
			'[2:32]>[2:37](89,94)div: <div>',
			'[2:37]>[2:39](94,96)#text: fn',
			'[2:39]>[2:45](96,102)div: </div>',
			'[3:18]>[3:23](123,128)div: <div>',
			'[3:23]>[3:24](128,129)#text: v',
			'[3:24]>[3:30](129,135)div: </div>',
			'[4:37]>[4:42](173,178)div: <div>',
			'[4:42]>[4:43](178,179)#text: C',
			'[4:43]>[4:49](179,185)div: </div>',
		]);
	});

	test('Code 8', () => {
		const ast = parse(`const Component = React.memo(function () { return <div>Component</div>; });
const Component2 = React.memo(() => { return <div>Component2</div>; });
const Component3 = memo(() => <div>Component3</div>);`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:51]>[1:56](50,55)div: <div>',
			'[1:56]>[1:65](55,64)#text: Component',
			'[1:65]>[1:71](64,70)div: </div>',
			'[2:46]>[2:51](121,126)div: <div>',
			'[2:51]>[2:61](126,136)#text: Component2',
			'[2:61]>[2:67](136,142)div: </div>',
			'[3:31]>[3:36](178,183)div: <div>',
			'[3:36]>[3:46](183,193)#text: Component3',
			'[3:46]>[3:52](193,199)div: </div>',
		]);
	});

	test('Code 9', () => {
		const ast = parse(`fn(() => {
	const Inner = () => <div>Component</div>;
	return <Inner />;
});`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[2:22]>[2:27](32,37)div: <div>',
			'[2:27]>[2:36](37,46)#text: Component',
			'[2:36]>[2:42](46,52)div: </div>',
			'[3:9]>[3:18](62,71)Inner: <Inner␣/>',
		]);
	});

	test('Code 10', () => {
		const ast = parse(`fn((prop) => {
	if (prop) {
		return prop ? <El1 /> : null;
	} else if (<El2 />) {
		return <>{prop ? <El3 /> : null}</>;
	} else {
		return prop && <El4 />;
	}
});`);
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[3:17]>[3:24](44,51)El1: <El1␣/>',
			'[4:13]>[4:20](72,79)El2: <El2␣/>',
			'[5:10]>[5:12](92,94)#jsx-fragment: <>',
			'[5:12]>[5:35](94,117)#ps:JSXExpressionContainer: {prop␣?␣<El3␣/>␣:␣null}',
			'[5:20]>[5:27](102,109)El3: <El3␣/>',
			'[5:35]>[5:38](117,120)#jsx-fragment: </>',
			'[7:18]>[7:25](149,156)El4: <El4␣/>',
		]);
	});

	test('Code 11', () => {
		const ast = parse('<p>{array.map(_ => <></>)}</p>');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:1]>[1:4](0,3)p: <p>',
			'[1:4]>[1:27](3,26)#ps:JSXExpressionContainer: {array.map(_␣=>␣<></>)}',
			'[1:20]>[1:22](19,21)#jsx-fragment: <>',
			'[1:22]>[1:25](21,24)#jsx-fragment: </>',
			'[1:27]>[1:31](26,30)p: </p>',
		]);

		expect(ast.nodeList[2].raw).toBe('<>');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].childNodes[0].raw).toBe('<>');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].childNodes[0].uuid).toBe(ast.nodeList[2].uuid);

		expect(ast.nodeList[3].raw).toBe('</>');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].childNodes[0].pairNode.raw).toBe('</>');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].childNodes[0].pairNode.uuid).toBe(ast.nodeList[3].uuid);

		// @ts-ignore
		expect(ast.nodeList[2].uuid).toBe(ast.nodeList[3].pairNode.uuid);
		// @ts-ignore
		expect(ast.nodeList[2].pairNode.uuid).toBe(ast.nodeList[3].uuid);
	});

	test('Attribute', () => {
		const ast = parse(
			'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" theProp={variable} />',
		);
		const nodeMaps = nodeListToDebugMaps(ast.nodeList);
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(nodeMaps).toStrictEqual([
			'[1:1]>[1:98](0,97)Component: <Component␣className="foo"␣tabIndex="-1"␣tabindex="-1"␣aria-label="accname"␣theProp={variable}␣/>',
		]);
		expect(attrMaps).toStrictEqual([
			[
				'[1:12]>[1:27](11,26)class: className="foo"',
				'  [1:11]>[1:12](10,11)bN: ␣',
				'  [1:12]>[1:21](11,20)name: className',
				'  [1:21]>[1:21](20,20)bE: ',
				'  [1:21]>[1:22](20,21)equal: =',
				'  [1:22]>[1:22](21,21)aE: ',
				'  [1:22]>[1:23](21,22)sQ: "',
				'  [1:23]>[1:26](22,25)value: foo',
				'  [1:26]>[1:27](25,26)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
				'  potentialName: class',
			],
			[
				'[1:28]>[1:41](27,40)tabindex: tabIndex="-1"',
				'  [1:27]>[1:28](26,27)bN: ␣',
				'  [1:28]>[1:36](27,35)name: tabIndex',
				'  [1:36]>[1:36](35,35)bE: ',
				'  [1:36]>[1:37](35,36)equal: =',
				'  [1:37]>[1:37](36,36)aE: ',
				'  [1:37]>[1:38](36,37)sQ: "',
				'  [1:38]>[1:40](37,39)value: -1',
				'  [1:40]>[1:41](39,40)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
				'  potentialName: tabindex',
			],
			[
				'[1:42]>[1:55](41,54)tabindex: tabindex="-1"',
				'  [1:41]>[1:42](40,41)bN: ␣',
				'  [1:42]>[1:50](41,49)name: tabindex',
				'  [1:50]>[1:50](49,49)bE: ',
				'  [1:50]>[1:51](49,50)equal: =',
				'  [1:51]>[1:51](50,50)aE: ',
				'  [1:51]>[1:52](50,51)sQ: "',
				'  [1:52]>[1:54](51,53)value: -1',
				'  [1:54]>[1:55](53,54)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
				'  potentialName: tabindex',
				'  candidate: tabIndex',
			],
			[
				'[1:56]>[1:76](55,75)aria-label: aria-label="accname"',
				'  [1:55]>[1:56](54,55)bN: ␣',
				'  [1:56]>[1:66](55,65)name: aria-label',
				'  [1:66]>[1:66](65,65)bE: ',
				'  [1:66]>[1:67](65,66)equal: =',
				'  [1:67]>[1:67](66,66)aE: ',
				'  [1:67]>[1:68](66,67)sQ: "',
				'  [1:68]>[1:75](67,74)value: accname',
				'  [1:75]>[1:76](74,75)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
			],
			[
				'[1:77]>[1:95](76,94)theProp: theProp={variable}',
				'  [1:76]>[1:77](75,76)bN: ␣',
				'  [1:77]>[1:84](76,83)name: theProp',
				'  [1:84]>[1:84](83,83)bE: ',
				'  [1:84]>[1:85](83,84)equal: =',
				'  [1:85]>[1:85](84,84)aE: ',
				'  [1:85]>[1:86](84,85)sQ: {',
				'  [1:86]>[1:94](85,93)value: variable',
				'  [1:94]>[1:95](93,94)eQ: }',
				'  isDirective: false',
				'  isDynamicValue: true',
			],
		]);
	});

	test('Static attribute', () => {
		const ast = parse('<a href=""/>');
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(attrMaps).toStrictEqual([
			[
				'[1:4]>[1:11](3,10)href: href=""',
				'  [1:3]>[1:4](2,3)bN: ␣',
				'  [1:4]>[1:8](3,7)name: href',
				'  [1:8]>[1:8](7,7)bE: ',
				'  [1:8]>[1:9](7,8)equal: =',
				'  [1:9]>[1:9](8,8)aE: ',
				'  [1:9]>[1:10](8,9)sQ: "',
				'  [1:10]>[1:10](9,9)value: ',
				'  [1:10]>[1:11](9,10)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
				'  potentialName: href',
			],
		]);
	});

	test('Dynamic attribute', () => {
		const ast = parse('<a href={}/>');
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(attrMaps).toStrictEqual([
			[
				'[1:4]>[1:11](3,10)href: href={}',
				'  [1:3]>[1:4](2,3)bN: ␣',
				'  [1:4]>[1:8](3,7)name: href',
				'  [1:8]>[1:8](7,7)bE: ',
				'  [1:8]>[1:9](7,8)equal: =',
				'  [1:9]>[1:9](8,8)aE: ',
				'  [1:9]>[1:10](8,9)sQ: {',
				'  [1:10]>[1:10](9,9)value: ',
				'  [1:10]>[1:11](9,10)eQ: }',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  potentialName: href',
			],
		]);
	});

	test('CRLF', () => {
		const ast = parse(
			`const
Component = () => {
	return (
		<ul
>
{[1, 2, 3]
.map(item => (
<li
key
=
{
	item
}>{
	item
}</li>
			))}
		</ul>
	);
};`.replaceAll('\n', '\r\n'),
		);
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[4:3]>[5:2](41,47)ul: <ul␣⏎>',
			'[5:2]>[6:1](47,49)#text: ␣⏎',
			'[6:1]>[16:7](49,126)#ps:JSXExpressionContainer: {[1,␣2,␣3]␣⏎.map(item␣=>␣(␣⏎<li␣⏎key␣⏎=␣⏎{␣⏎→item␣⏎}>{␣⏎→item␣⏎}</li>␣⏎→→→))}',
			'[8:1]>[13:3](77,102)li: <li␣⏎key␣⏎=␣⏎{␣⏎→item␣⏎}>',
			'[13:3]>[15:2](102,113)#ps:JSXExpressionContainer: {␣⏎→item␣⏎}',
			'[15:2]>[15:7](113,118)li: </li>',
			'[16:7]>[17:3](126,130)#text: ␣⏎→→',
			'[17:3]>[17:8](130,135)ul: </ul>',
		]);
	});

	test('Spread attributes', () => {
		const ast = parse('<a {...props}/>');
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(attrMaps).toStrictEqual([
			[
				//
				'[1:4]>[1:14](3,13)#spread: {...props}',
				'  #spread: {...props}',
			],
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
	});

	test('namespace', () => {
		const doc = parse('<div><svg><feBlend /></svg></div>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].namespace).toBe('http://www.w3.org/1999/xhtml');
		expect(doc.nodeList[1].nodeName).toBe('svg');
		expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].nodeName).toBe('feBlend');
		expect(doc.nodeList[2].namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].elementType).toBe('html');
	});

	test('isCustomElement', () => {
		expect(parse('<div/>').nodeList[0].elementType).toBe('html');
		expect(parse('<Div/>').nodeList[0].elementType).toBe('authored');
		expect(parse('<x-div/>').nodeList[0].elementType).toBe('web-component');
		expect(parse('<foo/>').nodeList[0].elementType).toBe('html');
		expect(parse('<Foo/>').nodeList[0].elementType).toBe('authored');
		expect(parse('<named.foo/>').nodeList[0].elementType).toBe('authored');
		expect(parse('<div><Foo/></div>').nodeList[1].elementType).toBe('authored');
		expect(parse('<div><Component/></div>').nodeList[1].elementType).toBe('authored');
		expect(parse('<svg><Component/></svg>').nodeList[1].elementType).toBe('authored');
		expect(parse('<svg><feBlend/></svg>').nodeList[1].elementType).toBe('html');
	});

	test('Comment', () => {
		const ast = parse(`// comment 1
/* comment 2 */`);
		const map = nodeListToDebugMaps(ast.nodeList);
		expect(map).toStrictEqual([
			//
			'[1:1]>[1:13](0,12)#comment: //␣comment␣1',
			'[2:1]>[2:16](13,28)#comment: /*␣comment␣2␣*/',
		]);
	});

	test('Comment in element', () => {
		const ast = parse(`// comment 1
/* comment 2 */

<div
// comment 3
/**
 * comment 4
 */
attr={value}
/>`);
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toStrictEqual([
			'[1:1]>[1:13](0,12)#comment: //␣comment␣1',
			'[2:1]>[2:16](13,28)#comment: /*␣comment␣2␣*/',
			'[4:1]>[10:3](30,84)div: <div⏎␣␣␣␣␣␣␣␣␣␣␣␣⏎␣␣␣⏎␣␣␣␣␣␣␣␣␣␣␣␣⏎␣␣␣⏎attr={value}⏎/>',
			'[9:1]>[9:13](69,81)attr: attr={value}',
			'  [4:5]>[9:1](34,69)bN: ⏎␣␣␣␣␣␣␣␣␣␣␣␣⏎␣␣␣⏎␣␣␣␣␣␣␣␣␣␣␣␣⏎␣␣␣⏎',
			'  [9:1]>[9:5](69,73)name: attr',
			'  [9:5]>[9:5](73,73)bE: ',
			'  [9:5]>[9:6](73,74)equal: =',
			'  [9:6]>[9:6](74,74)aE: ',
			'  [9:6]>[9:7](74,75)sQ: {',
			'  [9:7]>[9:12](75,80)value: value',
			'  [9:12]>[9:13](80,81)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[5:1]>[5:13](35,47)#comment: //␣comment␣3',
			'[6:1]>[8:4](48,68)#comment: /**⏎␣*␣comment␣4⏎␣*/',
		]);
	});
});

describe('Issues', () => {
	test('#1432', () => {
		const doc = parse(`const Component = () => {
  return (
    <div style={{ color: 'red' }}></div>
  );
};`);
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual([
			"[3:5]>[3:35](41,71)div: <div␣style={{␣color:␣'red'␣}}>",
			"[3:10]>[3:34](46,70)style: style={{␣color:␣'red'␣}}",
			'  [3:9]>[3:10](45,46)bN: ␣',
			'  [3:10]>[3:15](46,51)name: style',
			'  [3:15]>[3:15](51,51)bE: ',
			'  [3:15]>[3:16](51,52)equal: =',
			'  [3:16]>[3:16](52,52)aE: ',
			'  [3:16]>[3:17](52,53)sQ: {',
			"  [3:17]>[3:33](53,69)value: {␣color:␣'red'␣}",
			'  [3:33]>[3:34](69,70)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  potentialName: style',
			'[3:35]>[3:41](71,77)div: </div>',
		]);
	});

	test('#1440', () => {
		const doc = parse(`type Key = "name" | "address";

const x = {
  name: "Alice",
  address: "UK",
} as const satisfies Record<Key, string>;

const C = () => {
  return <div />;
};`);
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual(['[9:10]>[9:17](148,155)div: <div␣/>']);
	});

	test('#1451', () => {
		expect(parse('<div></div>').nodeList[0].elementType).toBe('html');
		expect(parse('<x-div></x-div>').nodeList[0].elementType).toBe('web-component');
		expect(parse('<Div></Div>').nodeList[0].elementType).toBe('authored');
	});
});
