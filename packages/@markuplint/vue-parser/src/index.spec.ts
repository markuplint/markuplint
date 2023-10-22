// @ts-nocheck

import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parse } from './parse.js';

describe('parser', () => {
	test('empty', () => {
		const doc = parse('');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	test('syntax error', () => {
		expect(() => {
			parse('"');
		}).toThrow('Unterminated string constant');
	});

	test('silent syntax error', () => {
		const doc = parse('<!--');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	test('template empty', () => {
		const doc = parse('<template></template>');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	test('<div />', () => {
		const doc = parse('<template><div /></template>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList.length).toBe(1);
	});

	test('<div></div>', () => {
		const doc = parse('<template><div></div></template>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[1].nodeName).toBe('div');
		expect(doc.nodeList.length).toBe(2);
	});

	test('text only', () => {
		const doc = parse('<template>text</template>');
		expect(doc.nodeList[0].nodeName).toBe('#text');
		expect(doc.nodeList[0].raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	test('fragments', () => {
		const doc = parse('<template><header></header><main></main><footer></footer></template>');
		expect(doc.nodeList[0].nodeName).toBe('header');
		expect(doc.nodeList[1].nodeName).toBe('header');
		expect(doc.nodeList[2].nodeName).toBe('main');
		expect(doc.nodeList[3].nodeName).toBe('main');
		expect(doc.nodeList[4].nodeName).toBe('footer');
		expect(doc.nodeList[5].nodeName).toBe('footer');
		expect(doc.nodeList.length).toBe(6);
	});

	test('standard code', () => {
		const doc = parse(`
	<template>
		<script>
			const i = 0;
		</script>
		<!comment-node>
		{{ CodeExpression }}
		<div>
			text&amp;div
		</div>
		<table>
			<tr>
				<th>header</th>
				<td>cell</td>
			</tr>
		</table>
		<table>
			<tbody>
				<tr>
					<th>header</th>
					<td>cell</td>
				</tr>
			</tbody>
		</table>
		<img src="path/to" />
				invalid-indent

		<?template engine;
			$var = '<html attr="value">text</html>'
		?>

		<%template engine;
			$var = '<html attr="value">text</html>'
		%>

		</expected>
		<div>
	text-node
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:11](15,23)script: <script>',
			'[3:11]>[5:3](23,42)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[5:3]>[5:12](42,51)script: </script>',
			'[5:12]>[7:3](51,72)#text: ⏎→→⏎→→',
			'[7:3]>[7:23](72,92)#vue-expression-container: {{␣CodeExpression␣}}',
			'[7:23]>[8:3](92,95)#text: ⏎→→',
			'[8:3]>[8:8](95,100)div: <div>',
			'[8:8]>[10:3](100,119)#text: ⏎→→→text&amp;div⏎→→',
			'[10:3]>[10:9](119,125)div: </div>',
			'[10:9]>[11:3](125,128)#text: ⏎→→',
			'[11:3]>[11:10](128,135)table: <table>',
			'[11:10]>[12:4](135,139)#text: ⏎→→→',
			'[12:4]>[12:8](139,143)tr: <tr>',
			'[12:8]>[13:5](143,148)#text: ⏎→→→→',
			'[13:5]>[13:9](148,152)th: <th>',
			'[13:9]>[13:15](152,158)#text: header',
			'[13:15]>[13:20](158,163)th: </th>',
			'[13:20]>[14:5](163,168)#text: ⏎→→→→',
			'[14:5]>[14:9](168,172)td: <td>',
			'[14:9]>[14:13](172,176)#text: cell',
			'[14:13]>[14:18](176,181)td: </td>',
			'[14:18]>[15:4](181,185)#text: ⏎→→→',
			'[15:4]>[15:9](185,190)tr: </tr>',
			'[15:9]>[16:3](190,193)#text: ⏎→→',
			'[16:3]>[16:11](193,201)table: </table>',
			'[16:11]>[17:3](201,204)#text: ⏎→→',
			'[17:3]>[17:10](204,211)table: <table>',
			'[17:10]>[18:4](211,215)#text: ⏎→→→',
			'[18:4]>[18:11](215,222)tbody: <tbody>',
			'[18:11]>[19:5](222,227)#text: ⏎→→→→',
			'[19:5]>[19:9](227,231)tr: <tr>',
			'[19:9]>[20:6](231,237)#text: ⏎→→→→→',
			'[20:6]>[20:10](237,241)th: <th>',
			'[20:10]>[20:16](241,247)#text: header',
			'[20:16]>[20:21](247,252)th: </th>',
			'[20:21]>[21:6](252,258)#text: ⏎→→→→→',
			'[21:6]>[21:10](258,262)td: <td>',
			'[21:10]>[21:14](262,266)#text: cell',
			'[21:14]>[21:19](266,271)td: </td>',
			'[21:19]>[22:5](271,276)#text: ⏎→→→→',
			'[22:5]>[22:10](276,281)tr: </tr>',
			'[22:10]>[23:4](281,285)#text: ⏎→→→',
			'[23:4]>[23:12](285,293)tbody: </tbody>',
			'[23:12]>[24:3](293,296)#text: ⏎→→',
			'[24:3]>[24:11](296,304)table: </table>',
			'[24:11]>[25:3](304,307)#text: ⏎→→',
			'[25:3]>[25:24](307,328)img: <img␣src="path/to"␣/>',
			"[25:24]>[33:12](328,451)#text: ⏎→→→→invalid-indent⏎⏎→→text'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'",
			'[33:12]>[33:31](451,470)html: <html␣attr="value">',
			'[33:31]>[33:35](470,474)#text: text',
			'[33:35]>[33:42](474,481)html: </html>',
			"[33:42]>[37:3](481,505)#text: '⏎→→%>⏎⏎→→⏎→→",
			'[37:3]>[37:8](505,510)div: <div>',
			'[37:8]>[39:2](510,523)#text: ⏎→text-node⏎→',
		]);
	});

	test('<template>', () => {
		const doc = parse(`
	<template>
		<script>
			const i = 0;
		</script>
		<!comment-node>
		<!-- html-comment -->
		<div>
			text&amp;div
		</div>
		<table>
			<tr>
				<th>header</th>
				<td>cell</td>
			</tr>
		</table>
		<table>
			<tbody>
				<tr>
					<th>header</th>
					<td>cell</td>
				</tr>
			</tbody>
		</table>
		<img src="path/to" />
				invalid-indent

		<?template engine;
			$var = '<html attr="value">text</html>'
		?>

		<%template engine;
			$var = '<html attr="value">text</html>'
		%>

		</expected>
		<div>
	text-node
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:11](15,23)script: <script>',
			'[3:11]>[5:3](23,42)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[5:3]>[5:12](42,51)script: </script>',
			'[5:12]>[8:3](51,96)#text: ⏎→→⏎→→⏎→→',
			'[8:3]>[8:8](96,101)div: <div>',
			'[8:8]>[10:3](101,120)#text: ⏎→→→text&amp;div⏎→→',
			'[10:3]>[10:9](120,126)div: </div>',
			'[10:9]>[11:3](126,129)#text: ⏎→→',
			'[11:3]>[11:10](129,136)table: <table>',
			'[11:10]>[12:4](136,140)#text: ⏎→→→',
			'[12:4]>[12:8](140,144)tr: <tr>',
			'[12:8]>[13:5](144,149)#text: ⏎→→→→',
			'[13:5]>[13:9](149,153)th: <th>',
			'[13:9]>[13:15](153,159)#text: header',
			'[13:15]>[13:20](159,164)th: </th>',
			'[13:20]>[14:5](164,169)#text: ⏎→→→→',
			'[14:5]>[14:9](169,173)td: <td>',
			'[14:9]>[14:13](173,177)#text: cell',
			'[14:13]>[14:18](177,182)td: </td>',
			'[14:18]>[15:4](182,186)#text: ⏎→→→',
			'[15:4]>[15:9](186,191)tr: </tr>',
			'[15:9]>[16:3](191,194)#text: ⏎→→',
			'[16:3]>[16:11](194,202)table: </table>',
			'[16:11]>[17:3](202,205)#text: ⏎→→',
			'[17:3]>[17:10](205,212)table: <table>',
			'[17:10]>[18:4](212,216)#text: ⏎→→→',
			'[18:4]>[18:11](216,223)tbody: <tbody>',
			'[18:11]>[19:5](223,228)#text: ⏎→→→→',
			'[19:5]>[19:9](228,232)tr: <tr>',
			'[19:9]>[20:6](232,238)#text: ⏎→→→→→',
			'[20:6]>[20:10](238,242)th: <th>',
			'[20:10]>[20:16](242,248)#text: header',
			'[20:16]>[20:21](248,253)th: </th>',
			'[20:21]>[21:6](253,259)#text: ⏎→→→→→',
			'[21:6]>[21:10](259,263)td: <td>',
			'[21:10]>[21:14](263,267)#text: cell',
			'[21:14]>[21:19](267,272)td: </td>',
			'[21:19]>[22:5](272,277)#text: ⏎→→→→',
			'[22:5]>[22:10](277,282)tr: </tr>',
			'[22:10]>[23:4](282,286)#text: ⏎→→→',
			'[23:4]>[23:12](286,294)tbody: </tbody>',
			'[23:12]>[24:3](294,297)#text: ⏎→→',
			'[24:3]>[24:11](297,305)table: </table>',
			'[24:11]>[25:3](305,308)#text: ⏎→→',
			'[25:3]>[25:24](308,329)img: <img␣src="path/to"␣/>',
			"[25:24]>[33:12](329,452)#text: ⏎→→→→invalid-indent⏎⏎→→text'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'",
			'[33:12]>[33:31](452,471)html: <html␣attr="value">',
			'[33:31]>[33:35](471,475)#text: text',
			'[33:35]>[33:42](475,482)html: </html>',
			"[33:42]>[37:3](482,506)#text: '⏎→→%>⏎⏎→→⏎→→",
			'[37:3]>[37:8](506,511)div: <div>',
			'[37:8]>[39:2](511,524)#text: ⏎→text-node⏎→',
		]);
	});

	test('<noscript>', () => {
		const doc = parse(`
	<template>
	<noscript>
		<div>test</div>
		<expected>
		</expected2>
	</noscript>
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:12]>[3:2](12,14)#text: ⏎→',
			'[3:2]>[3:12](14,24)noscript: <noscript>',
			'[3:12]>[7:2](24,72)#text: ⏎→→<div>test</div>⏎→→<expected>⏎→→</expected2>⏎→',
			'[7:2]>[7:13](72,83)noscript: </noscript>',
			'[7:13]>[8:2](83,85)#text: ⏎→',
		]);
	});

	test('UUID', () => {
		const doc = parse(
			'<template><x-wrap><x-before><span>title</span></x-before><x-after><div>test</div></x-after></x-wrap></template>',
		);
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		// console.log(doc.nodeList.map((n, i) => `${i}: ${n.uuid} ${n.raw.trim()}`));

		// <x-wrap>
		expect(doc.nodeList[0].parentNode).toEqual(null);
		expect(doc.nodeList[0].prevNode).toEqual(null);
		expect(doc.nodeList[0].nextNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[0].pearNode.uuid).toEqual(doc.nodeList[11].uuid);

		// </x-wrap>
		expect(doc.nodeList[11].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[11].pearNode.uuid).toEqual(doc.nodeList[0].uuid);

		// <x-before>
		// @ts-ignore
		expect(doc.nodeList[1].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[1].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[1].nextNode.uuid).toEqual(doc.nodeList[6].uuid);
		// @ts-ignore
		expect(doc.nodeList[1].pearNode.uuid).toEqual(doc.nodeList[5].uuid);

		// </x-before>
		// @ts-ignore
		expect(doc.nodeList[5].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[5].pearNode.uuid).toEqual(doc.nodeList[1].uuid);

		// <x-after>
		// @ts-ignore
		expect(doc.nodeList[6].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[6].prevNode.uuid).toEqual(doc.nodeList[1].uuid);
		// @ts-ignore
		expect(doc.nodeList[6].nextNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[6].pearNode.uuid).toEqual(doc.nodeList[10].uuid);

		// </x-after>
		// @ts-ignore
		expect(doc.nodeList[10].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[10].pearNode.uuid).toEqual(doc.nodeList[6].uuid);
	});

	test('attributes', () => {
		const doc = parse(
			'<template><div v-if="bool" data-attr v-bind:data-attr2="variable" @click.once="event" v-on:click.foobar="event"></div></template>',
		);
		// @ts-ignore
		expect(doc.nodeList[0].attributes[0].raw).toBe('v-if="bool"');
		// @ts-ignore
		expect(doc.nodeList[0].attributes[0].isDirective).toBeTruthy();
		// @ts-ignore
		expect(doc.nodeList[0].attributes[1].raw).toBe('data-attr');
		// @ts-ignore
		expect(doc.nodeList[0].attributes[1].isDirective).toBeUndefined();
		// @ts-ignore
		expect(doc.nodeList[0].attributes[2].raw).toBe('v-bind:data-attr2="variable"');
		// @ts-ignore
		expect(doc.nodeList[0].attributes[2].potentialName).toBe('data-attr2');
		// @ts-ignore
		expect(doc.nodeList[0].attributes[3].isDirective).toBeFalsy();
		// @ts-ignore
		expect(doc.nodeList[0].attributes[4].isDirective).toBeFalsy();
	});

	test('namespace', () => {
		const doc = parse('<template><div><svg><text /></svg></div></template>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].namespace).toBe('http://www.w3.org/1999/xhtml');
		expect(doc.nodeList[1].nodeName).toBe('svg');
		expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].nodeName).toBe('text');
		expect(doc.nodeList[2].namespace).toBe('http://www.w3.org/2000/svg');
	});

	test('elementType', () => {
		expect(parse('<template><div/></template>').nodeList[0].elementType).toBe('html');
		expect(parse('<template><Div/></template>').nodeList[0].elementType).toBe('authored');
		expect(parse('<template><x-div/></template>').nodeList[0].elementType).toBe('web-component');
		expect(parse('<template><foo/></template>').nodeList[0].elementType).toBe('html');
		expect(parse('<template><Foo/></template>').nodeList[0].elementType).toBe('authored');
		expect(parse('<template><div><Foo/></div></template>').nodeList[1].elementType).toBe('authored');
		expect(parse('<template><div><Component/></div></template>').nodeList[1].elementType).toBe('authored');
		expect(parse('<template><svg><Component/></svg></template>').nodeList[1].elementType).toBe('authored');
		expect(parse('<template><svg><feBlend/></svg></template>').nodeList[1].elementType).toBe('html');
		expect(parse('<template><component/></template>').nodeList[0].elementType).toBe('authored');
		expect(parse('<template><slot/></template>').nodeList[0].elementType).toBe('authored');
		expect(parse('<template><Transition/></template>').nodeList[0].elementType).toBe('authored');
		expect(parse('<template><transition/></template>').nodeList[0].elementType).toBe('html');
	});

	test('Directives', () => {
		const doc = parse(`
	<template>
		<div>
			<template #header></template>
		</div>
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:8](15,20)div: <div>',
			'[3:8]>[4:4](20,24)#text: ⏎→→→',
			'[4:4]>[4:22](24,42)template: <template␣#header>',
			'[4:14]>[4:21](34,41)v-slot:header: #header',
			'  [4:13]>[4:14](33,34)bN: ␣',
			'  [4:14]>[4:21](34,41)name: #header',
			'  [4:21]>[4:21](41,41)bE: ',
			'  [4:21]>[4:21](41,41)equal: ',
			'  [4:21]>[4:21](41,41)aE: ',
			'  [4:21]>[4:21](41,41)sQ: ',
			'  [4:21]>[4:21](41,41)value: ',
			'  [4:21]>[4:21](41,41)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: false',
			'  potentialName: v-slot:header',
			'[4:33]>[5:3](53,56)#text: ⏎→→',
			'[5:3]>[5:9](56,62)div: </div>',
			'[5:9]>[6:2](62,64)#text: ⏎→',
		]);
	});
});

describe('Issues', () => {
	test('#783', () => {
		const doc = parse(`
	<template>
		<button @click.stop="foo" v-on:click.stop="bar">...</button>
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:51](15,63)button: <button␣@click.stop="foo"␣v-on:click.stop="bar">',
			'[3:11]>[3:28](23,40)onclick: @click.stop="foo"',
			'  [3:10]>[3:11](22,23)bN: ␣',
			'  [3:11]>[3:22](23,34)name: @click.stop',
			'  [3:22]>[3:22](34,34)bE: ',
			'  [3:22]>[3:23](34,35)equal: =',
			'  [3:23]>[3:23](35,35)aE: ',
			'  [3:23]>[3:24](35,36)sQ: "',
			'  [3:24]>[3:27](36,39)value: foo',
			'  [3:27]>[3:28](39,40)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  potentialName: onclick',
			'[3:29]>[3:50](41,62)onclick: v-on:click.stop="bar"',
			'  [3:28]>[3:29](40,41)bN: ␣',
			'  [3:29]>[3:44](41,56)name: v-on:click.stop',
			'  [3:44]>[3:44](56,56)bE: ',
			'  [3:44]>[3:45](56,57)equal: =',
			'  [3:45]>[3:45](57,57)aE: ',
			'  [3:45]>[3:46](57,58)sQ: "',
			'  [3:46]>[3:49](58,61)value: bar',
			'  [3:49]>[3:50](61,62)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: true',
			'  potentialName: onclick',
			'[3:51]>[3:54](63,66)#text: ...',
			'[3:54]>[3:63](66,75)button: </button>',
			'[3:63]>[4:2](75,77)#text: ⏎→',
		]);
	});

	test('#1048', () => {
		const doc = parse(`
	<template>
		<ul v-if="props.examples.length > 0">
			<!-- Error if comment inserted inside ul element -->
			<li v-for="item in props.examples" :key="item.id">
				{{ item.name }}
			</li>
		</ul>
	</template>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:40](15,52)ul: <ul␣v-if="props.examples.length␣>␣0">',
			'[3:40]>[4:4](52,56)#text: ⏎→→→',
			'[4:4]>[4:56](56,108)#comment: <!--␣Error␣if␣comment␣inserted␣inside␣ul␣element␣-->',
			'[4:56]>[5:4](108,112)#text: ⏎→→→',
			'[5:4]>[5:54](112,162)li: <li␣v-for="item␣in␣props.examples"␣:key="item.id">',
			'[5:54]>[6:5](162,167)#text: ⏎→→→→',
			'[6:5]>[6:20](167,182)#vue-expression-container: {{␣item.name␣}}',
			'[6:20]>[7:4](182,186)#text: ⏎→→→',
			'[7:4]>[7:9](186,191)li: </li>',
			'[7:9]>[8:3](191,194)#text: ⏎→→',
			'[8:3]>[8:8](194,199)ul: </ul>',
			'[8:8]>[9:2](199,201)#text: ⏎→',
		]);

		const ul = doc.nodeList[1];
		expect(ul.childNodes.length).toBe(5);
	});
});
