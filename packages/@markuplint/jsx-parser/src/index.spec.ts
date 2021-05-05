import { attributesToDebugMaps, nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parse } from './parse';

describe('parse', () => {
	it('Element only', () => {
		const ast = parse('<div></div>');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual(['[1:1]>[1:6](0,5)div: <div>', '[1:6]>[1:12](5,11)div: </div>']);
	});

	it('Flagment', () => {
		const ast = parse('<></>');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual(['[1:1]>[1:3](0,2)#jsx-fragment: <>', '[1:3]>[1:6](2,5)#jsx-fragment: </>']);
	});

	it('Nesting', () => {
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

	it('Code', () => {
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

	it('Code 2', () => {
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

	it('Code 3', () => {
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
			'[5:5]>[5:20](75,90)li: <li␣key={item}>',
			'[5:26]>[5:31](96,101)li: </li>',
			'[6:7]>[7:3](108,111)#text: ⏎→→',
			'[7:3]>[7:8](111,116)ul: </ul>',
		]);
	});

	it('Code 3 - Parent-child relationship', () => {
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
		expect(ast.nodeList[0].childNodes.length).toBe(2);
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[0].nodeName).toBe('#text');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes[1].nodeName).toBe('#text');
		expect(ast.nodeList[3].parentNode).toBeNull();
	});

	it('Code 4', () => {
		const ast = parse('const Component = () => <Children prop={<PropElement />} />;');
		const maps = nodeListToDebugMaps(ast.nodeList);
		expect(maps).toStrictEqual([
			'[1:25]>[1:60](24,59)Children: <Children␣prop={<PropElement␣/>}␣/>',
			'[1:41]>[1:56](40,55)PropElement: <PropElement␣/>',
		]);
	});

	it('Code 4 - Parent-child relationship', () => {
		const ast = parse('const Component = () => <Children prop={<PropElement />} />;');
		// @ts-ignore
		expect(ast.nodeList[0].childNodes.length).toBe(0);
		expect(ast.nodeList[1].parentNode).toBeNull();
	});

	it('Code 5', () => {
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

	it('Code 6', () => {
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

	it('Attribute', () => {
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
				'[1:11]>[1:27](10,26)class: ␣className="foo"',
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
				'  isInvalid: false',
				'  potentialName: class',
			],
			[
				'[1:27]>[1:41](26,40)tabindex: ␣tabIndex="-1"',
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
				'  isInvalid: false',
				'  potentialName: tabindex',
			],
			[
				'[1:41]>[1:55](40,54)tabindex: ␣tabindex="-1"',
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
				'  isInvalid: true',
				'  candidate: tabIndex',
			],
			[
				'[1:55]>[1:76](54,75)aria-label: ␣aria-label="accname"',
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
				'  isInvalid: false',
			],
			[
				'[1:76]>[1:95](75,94)theProp: ␣theProp={variable}',
				'  [1:76]>[1:77](75,76)bN: ␣',
				'  [1:77]>[1:84](76,83)name: theProp',
				'  [1:84]>[1:84](83,83)bE: ',
				'  [1:84]>[1:85](83,84)equal: =',
				'  [1:85]>[1:85](84,84)aE: ',
				'  [1:85]>[1:85](84,84)sQ: ',
				'  [1:85]>[1:95](84,94)value: {variable}',
				'  [1:95]>[1:95](94,94)eQ: ',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  isInvalid: false',
			],
		]);
	});

	it('Static attribute', () => {
		const ast = parse('<a href=""/>');
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(attrMaps).toStrictEqual([
			[
				'[1:3]>[1:11](2,10)href: ␣href=""',
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
				'  isInvalid: false',
				'  potentialName: href',
			],
		]);
	});

	it('Dynamic attribute', () => {
		const ast = parse('<a href={}/>');
		// @ts-ignore
		const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
		expect(attrMaps).toStrictEqual([
			[
				'[1:3]>[1:11](2,10)href: ␣href={}',
				'  [1:3]>[1:4](2,3)bN: ␣',
				'  [1:4]>[1:8](3,7)name: href',
				'  [1:8]>[1:8](7,7)bE: ',
				'  [1:8]>[1:9](7,8)equal: =',
				'  [1:9]>[1:9](8,8)aE: ',
				'  [1:9]>[1:9](8,8)sQ: ',
				'  [1:9]>[1:11](8,10)value: {}',
				'  [1:11]>[1:11](10,10)eQ: ',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  isInvalid: false',
				'  potentialName: href',
			],
		]);
	});
});
