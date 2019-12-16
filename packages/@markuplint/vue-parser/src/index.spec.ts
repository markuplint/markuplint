import * as VueParser from './';

describe('parser', () => {
	it('empty code', () => {
		const doc = VueParser.parse('<template></template>');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	it('<div />', () => {
		const doc = VueParser.parse('<template><div /></template>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList.length).toBe(1);
	});

	it('<div></div>', () => {
		const doc = VueParser.parse('<template><div></div></template>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[1].nodeName).toBe('div');
		expect(doc.nodeList.length).toBe(2);
	});

	it('text only', () => {
		const doc = VueParser.parse('<template>text</template>');
		expect(doc.nodeList[0].nodeName).toBe('#text');
		expect(doc.nodeList[0].raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	it('standard code', () => {
		const doc = VueParser.parse(`
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
		const map = VueParser.nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:11]>[3:3](12,15)#text: ⏎→→',
			'[3:2]>[3:10](15,23)script: <script>',
			'[3:10]>[5:2](23,42)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[5:2]>[5:11](42,51)script: </script>',
			'[5:11]>[7:3](51,72)#text: ⏎→→⏎→→',
			'[7:2]>[7:22](72,92)#comment: {{␣CodeExpression␣}}',
			'[7:22]>[8:3](92,95)#text: ⏎→→',
			'[8:2]>[8:7](95,100)div: <div>',
			'[8:7]>[10:3](100,119)#text: ⏎→→→text&amp;div⏎→→',
			'[10:2]>[10:8](119,125)div: </div>',
			'[10:8]>[11:3](125,128)#text: ⏎→→',
			'[11:2]>[11:9](128,135)table: <table>',
			'[11:9]>[12:4](135,139)#text: ⏎→→→',
			'[12:3]>[12:7](139,143)tr: <tr>',
			'[12:7]>[13:5](143,148)#text: ⏎→→→→',
			'[13:4]>[13:8](148,152)th: <th>',
			'[13:8]>[13:14](152,158)#text: header',
			'[13:14]>[13:19](158,163)th: </th>',
			'[13:19]>[14:5](163,168)#text: ⏎→→→→',
			'[14:4]>[14:8](168,172)td: <td>',
			'[14:8]>[14:12](172,176)#text: cell',
			'[14:12]>[14:17](176,181)td: </td>',
			'[14:17]>[15:4](181,185)#text: ⏎→→→',
			'[15:3]>[15:8](185,190)tr: </tr>',
			'[15:8]>[16:3](190,193)#text: ⏎→→',
			'[16:2]>[16:10](193,201)table: </table>',
			'[16:10]>[17:3](201,204)#text: ⏎→→',
			'[17:2]>[17:9](204,211)table: <table>',
			'[17:9]>[18:4](211,215)#text: ⏎→→→',
			'[18:3]>[18:10](215,222)tbody: <tbody>',
			'[18:10]>[19:5](222,227)#text: ⏎→→→→',
			'[19:4]>[19:8](227,231)tr: <tr>',
			'[19:8]>[20:6](231,237)#text: ⏎→→→→→',
			'[20:5]>[20:9](237,241)th: <th>',
			'[20:9]>[20:15](241,247)#text: header',
			'[20:15]>[20:20](247,252)th: </th>',
			'[20:20]>[21:6](252,258)#text: ⏎→→→→→',
			'[21:5]>[21:9](258,262)td: <td>',
			'[21:9]>[21:13](262,266)#text: cell',
			'[21:13]>[21:18](266,271)td: </td>',
			'[21:18]>[22:5](271,276)#text: ⏎→→→→',
			'[22:4]>[22:9](276,281)tr: </tr>',
			'[22:9]>[23:4](281,285)#text: ⏎→→→',
			'[23:3]>[23:11](285,293)tbody: </tbody>',
			'[23:11]>[24:3](293,296)#text: ⏎→→',
			'[24:2]>[24:10](296,304)table: </table>',
			'[24:10]>[25:3](304,307)#text: ⏎→→',
			'[25:2]>[25:23](307,328)img: <img␣src="path/to"␣/>',
			"[25:23]>[33:12](328,451)#text: ⏎→→→→invalid-indent⏎⏎→→text'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'",
			'[33:11]>[33:30](451,470)html: <html␣attr="value">',
			'[33:30]>[33:34](470,474)#text: text',
			'[33:34]>[33:41](474,481)html: </html>',
			"[33:41]>[37:3](481,505)#text: '⏎→→%>⏎⏎→→⏎→→",
			'[37:2]>[37:7](505,510)div: <div>',
			'[37:7]>[39:2](510,523)#text: ⏎→text-node⏎→',
		]);
	});

	it('<template>', () => {
		const doc = VueParser.parse(`
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
		const map = VueParser.nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:11]>[3:3](12,15)#text: ⏎→→',
			'[3:2]>[3:10](15,23)script: <script>',
			'[3:10]>[5:2](23,42)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[5:2]>[5:11](42,51)script: </script>',
			'[5:11]>[8:3](51,96)#text: ⏎→→⏎→→⏎→→',
			'[8:2]>[8:7](96,101)div: <div>',
			'[8:7]>[10:3](101,120)#text: ⏎→→→text&amp;div⏎→→',
			'[10:2]>[10:8](120,126)div: </div>',
			'[10:8]>[11:3](126,129)#text: ⏎→→',
			'[11:2]>[11:9](129,136)table: <table>',
			'[11:9]>[12:4](136,140)#text: ⏎→→→',
			'[12:3]>[12:7](140,144)tr: <tr>',
			'[12:7]>[13:5](144,149)#text: ⏎→→→→',
			'[13:4]>[13:8](149,153)th: <th>',
			'[13:8]>[13:14](153,159)#text: header',
			'[13:14]>[13:19](159,164)th: </th>',
			'[13:19]>[14:5](164,169)#text: ⏎→→→→',
			'[14:4]>[14:8](169,173)td: <td>',
			'[14:8]>[14:12](173,177)#text: cell',
			'[14:12]>[14:17](177,182)td: </td>',
			'[14:17]>[15:4](182,186)#text: ⏎→→→',
			'[15:3]>[15:8](186,191)tr: </tr>',
			'[15:8]>[16:3](191,194)#text: ⏎→→',
			'[16:2]>[16:10](194,202)table: </table>',
			'[16:10]>[17:3](202,205)#text: ⏎→→',
			'[17:2]>[17:9](205,212)table: <table>',
			'[17:9]>[18:4](212,216)#text: ⏎→→→',
			'[18:3]>[18:10](216,223)tbody: <tbody>',
			'[18:10]>[19:5](223,228)#text: ⏎→→→→',
			'[19:4]>[19:8](228,232)tr: <tr>',
			'[19:8]>[20:6](232,238)#text: ⏎→→→→→',
			'[20:5]>[20:9](238,242)th: <th>',
			'[20:9]>[20:15](242,248)#text: header',
			'[20:15]>[20:20](248,253)th: </th>',
			'[20:20]>[21:6](253,259)#text: ⏎→→→→→',
			'[21:5]>[21:9](259,263)td: <td>',
			'[21:9]>[21:13](263,267)#text: cell',
			'[21:13]>[21:18](267,272)td: </td>',
			'[21:18]>[22:5](272,277)#text: ⏎→→→→',
			'[22:4]>[22:9](277,282)tr: </tr>',
			'[22:9]>[23:4](282,286)#text: ⏎→→→',
			'[23:3]>[23:11](286,294)tbody: </tbody>',
			'[23:11]>[24:3](294,297)#text: ⏎→→',
			'[24:2]>[24:10](297,305)table: </table>',
			'[24:10]>[25:3](305,308)#text: ⏎→→',
			'[25:2]>[25:23](308,329)img: <img␣src="path/to"␣/>',
			"[25:23]>[33:12](329,452)#text: ⏎→→→→invalid-indent⏎⏎→→text'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'",
			'[33:11]>[33:30](452,471)html: <html␣attr="value">',
			'[33:30]>[33:34](471,475)#text: text',
			'[33:34]>[33:41](475,482)html: </html>',
			"[33:41]>[37:3](482,506)#text: '⏎→→%>⏎⏎→→⏎→→",
			'[37:2]>[37:7](506,511)div: <div>',
			'[37:7]>[39:2](511,524)#text: ⏎→text-node⏎→',
		]);
	});

	it('<noscript>', () => {
		const doc = VueParser.parse(`
	<template>
	<noscript>
		<div>test</div>
		<expected>
		</expected2>
	</noscript>
	</template>
	`);
		const map = VueParser.nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:11]>[3:2](12,14)#text: ⏎→',
			'[3:1]>[3:11](14,24)noscript: <noscript>',
			'[3:11]>[7:2](24,72)#text: ⏎→→<div>test</div>⏎→→<expected>⏎→→</expected2>⏎→',
			'[7:1]>[7:12](72,83)noscript: </noscript>',
			'[7:12]>[8:2](83,85)#text: ⏎→',
		]);
	});
});
