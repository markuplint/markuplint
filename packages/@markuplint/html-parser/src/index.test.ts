import * as HTMLParser from './';

import { MLASTNodeType } from '@markuplint/ml-ast';

describe('isDocumentFragment', () => {
	it('<!doctype>', () => {
		expect(HTMLParser.isDocumentFragment('<!DOCTYPE html>')).toBe(false);
	});

	it('<!doctype> - 2', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		`),
		).toBe(false);
	});

	it('<!doctype> + <html>', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html>
		`),
		).toBe(false);
	});

	it('<!doctype> + <html></html>', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html></html>
		`),
		).toBe(false);
	});

	it('<!doctype> + <html> - 2', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<html lang="ja">
		`),
		).toBe(false);
	});

	it('<!doctype> + <html></html> - 2', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<html lang="ja"></html>
		`),
		).toBe(false);
	});

	it('<html></html>', () => {
		expect(HTMLParser.isDocumentFragment('<html lang="ja"></html>')).toBe(false);
	});

	it('<html></html> - 2', () => {
		expect(HTMLParser.isDocumentFragment('<html></html>')).toBe(false);
	});

	it('<body>', () => {
		expect(
			HTMLParser.isDocumentFragment(`
		<body>
		`),
		).toBe(true);
	});

	it('<body></body>', () => {
		expect(HTMLParser.isDocumentFragment('<body></body>')).toBe(true);
	});

	it('<div></div>', () => {
		expect(HTMLParser.isDocumentFragment('<div></div>')).toBe(true);
	});

	it('<template></template>', () => {
		expect(HTMLParser.isDocumentFragment('<template></template>')).toBe(true);
	});

	it('<head></head>', () => {
		expect(HTMLParser.isDocumentFragment('<head></head>')).toBe(true);
	});
});

describe('parser', () => {
	it('<!DOCTYPE html>', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList.length).toBe(4);
	});

	it('<!DOCTYPE html> ', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html> ');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].nodeName).toBe('#text');
		expect(nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\n', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>\n');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].nodeName).toBe('#text');
		expect(nodeList[4].raw).toBe('\n');
		expect(nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>text', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>text');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(nodeList[4].startCol).toBe(16);
		expect(nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html> text', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html> text');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(nodeList[4].raw).toBe(' text');
		expect(nodeList[4].startCol).toBe(16);
		expect(nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\ntext', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>\ntext');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(nodeList[4].raw).toBe('\ntext');
		expect(nodeList[4].startCol).toBe(16);
		expect(nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\n<p>text', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>\n<p>text');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].nodeName).toBe('#text');
		expect(nodeList[5].nodeName).toBe('p');
		expect(nodeList[6].type).toBe(MLASTNodeType.Text);
		expect(nodeList[6].raw).toBe('text');
		expect(nodeList[6].startCol).toBe(4);
		expect(nodeList.length).toBe(7);
	});

	it('<!DOCTYPE html><p>\\ntext', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html><p>\ntext');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].nodeName).toBe('p');
		expect(nodeList[5].type).toBe(MLASTNodeType.Text);
		expect(nodeList[5].raw).toBe('\ntext');
		expect(nodeList[5].startCol).toBe(19);
		expect(nodeList.length).toBe(6);
	});

	it('<!DOCTYPE html>\\n<html>text', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html>\n<html>text');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('#text');
		expect(nodeList[2].nodeName).toBe('html');
		expect(nodeList[3].nodeName).toBe('head');
		expect(nodeList[4].nodeName).toBe('body');
		expect(nodeList[5].type).toBe(MLASTNodeType.Text);
		expect(nodeList[5].raw).toBe('text');
		expect(nodeList[5].startCol).toBe(7);
		expect(nodeList.length).toBe(6);
	});

	it('<!DOCTYPE html><html>\\ntext', () => {
		const nodeList = HTMLParser.parse('<!DOCTYPE html><html>\ntext');
		expect(nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(nodeList[1].nodeName).toBe('html');
		expect(nodeList[2].nodeName).toBe('head');
		expect(nodeList[3].nodeName).toBe('body');
		expect(nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(nodeList[4].raw).toBe('\ntext');
		expect(nodeList[4].startCol).toBe(22);
		expect(nodeList.length).toBe(5);
	});

	it('empty code', () => {
		const nodeList = HTMLParser.parse('');
		expect(nodeList).toStrictEqual([]);
		expect(nodeList.length).toBe(0);
	});

	it('<html>', () => {
		const nodeList = HTMLParser.parse('<html>');
		expect(nodeList[0].nodeName).toBe('html');
		expect(nodeList[1].nodeName).toBe('head');
		expect(nodeList[2].nodeName).toBe('body');
		expect(nodeList.length).toBe(3);
	});

	it('<html></body>', () => {
		const nodeList = HTMLParser.parse('<html></body>');
		expect(nodeList[0].nodeName).toBe('html');
		expect(nodeList[1].nodeName).toBe('head');
		expect(nodeList[2].nodeName).toBe('body');
		expect(nodeList[3].nodeName).toBe('#text');
		expect(nodeList[3].raw).toBe('</body>');
		expect(nodeList.length).toBe(4);
	});

	it('text only', () => {
		const nodeList = HTMLParser.parse('text');
		expect(nodeList[0].nodeName).toBe('#text');
		expect(nodeList[0].raw).toBe('text');
		expect(nodeList.length).toBe(1);
	});

	it('<html>invalid-before-text<body>text</body>invalid-after-text</html>', () => {
		const nodeList = HTMLParser.parse('<html>invalid-before-text<body>text</body>invalid-after-text</html>');
		expect(nodeList[0].nodeName).toBe('html');
		expect(nodeList[1].nodeName).toBe('head');
		expect(nodeList[2].nodeName).toBe('body');
		expect(nodeList[3].nodeName).toBe('#text');
		expect(nodeList[4].nodeName).toBe('#invalid');
		expect(nodeList[5].nodeName).toBe('#text');
		expect(nodeList[6].nodeName).toBe('#invalid');
		expect(nodeList[7].nodeName).toBe('#text');
		expect(nodeList[8].nodeName).toBe('html');
		expect(nodeList.length).toBe(9);
	});

	it('standard code', () => {
		const nodeList = HTMLParser.parse(`
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="ie=edge">
		<title>Document</title>
	</head>
	<body>
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
	</body>
	</html>
	`);
		const map = HTMLParser.nodeListToDebugMaps(nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:17](2,17)#doctype: <!DOCTYPE␣html>',
			'[2:17]>[3:2](17,19)#text: ⏎→',
			'[3:2]>[3:18](19,35)html: <html␣lang="en">',
			'[3:18]>[4:2](35,37)#text: ⏎→',
			'[4:2]>[4:8](37,43)head: <head>',
			'[4:8]>[5:3](43,46)#text: ⏎→→',
			'[5:3]>[5:25](46,68)meta: <meta␣charset="UTF-8">',
			'[5:25]>[6:3](68,71)#text: ⏎→→',
			'[6:3]>[6:73](71,141)meta: <meta␣name="viewport"␣content="width=device-width,␣initial-scale=1.0">',
			'[6:73]>[7:3](141,144)#text: ⏎→→',
			'[7:3]>[7:56](144,197)meta: <meta␣http-equiv="X-UA-Compatible"␣content="ie=edge">',
			'[7:56]>[8:3](197,200)#text: ⏎→→',
			'[8:3]>[8:10](200,207)title: <title>',
			'[8:10]>[8:18](207,215)#text: Document',
			'[8:18]>[8:26](215,223)title: </title>',
			'[8:26]>[9:2](223,225)#text: ⏎→',
			'[9:2]>[9:9](225,232)head: </head>',
			'[9:9]>[10:2](232,234)#text: ⏎→',
			'[10:2]>[10:8](234,240)body: <body>',
			'[10:8]>[11:3](240,243)#text: ⏎→→',
			'[11:3]>[11:11](243,251)script: <script>',
			'[11:11]>[13:3](251,270)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[13:3]>[13:12](270,279)script: </script>',
			'[13:12]>[14:3](279,282)#text: ⏎→→',
			'[14:3]>[14:18](282,297)#comment: <!comment-node>',
			'[14:18]>[15:3](297,300)#text: ⏎→→',
			'[15:3]>[15:24](300,321)#comment: <!--␣html-comment␣-->',
			'[15:24]>[16:3](321,324)#text: ⏎→→',
			'[16:3]>[16:8](324,329)div: <div>',
			'[16:8]>[18:3](329,348)#text: ⏎→→→text&amp;div⏎→→',
			'[18:3]>[18:9](348,354)div: </div>',
			'[18:9]>[19:3](354,357)#text: ⏎→→',
			'[19:3]>[19:10](357,364)table: <table>',
			'[19:10]>[20:4](364,368)#text: ⏎→→→',
			'[N/A]>[N/A](N/A)tbody: ',
			'[20:4]>[20:8](368,372)tr: <tr>',
			'[20:8]>[21:5](372,377)#text: ⏎→→→→',
			'[21:5]>[21:9](377,381)th: <th>',
			'[21:9]>[21:15](381,387)#text: header',
			'[21:15]>[21:20](387,392)th: </th>',
			'[21:20]>[22:5](392,397)#text: ⏎→→→→',
			'[22:5]>[22:9](397,401)td: <td>',
			'[22:9]>[22:13](401,405)#text: cell',
			'[22:13]>[22:18](405,410)td: </td>',
			'[22:18]>[23:4](410,414)#text: ⏎→→→',
			'[23:4]>[23:9](414,419)tr: </tr>',
			'[23:9]>[24:3](419,422)#text: ⏎→→',
			'[24:3]>[24:11](422,430)table: </table>',
			'[24:11]>[25:3](430,433)#text: ⏎→→',
			'[25:3]>[25:10](433,440)table: <table>',
			'[25:10]>[26:4](440,444)#text: ⏎→→→',
			'[26:4]>[26:11](444,451)tbody: <tbody>',
			'[26:11]>[27:5](451,456)#text: ⏎→→→→',
			'[27:5]>[27:9](456,460)tr: <tr>',
			'[27:9]>[28:6](460,466)#text: ⏎→→→→→',
			'[28:6]>[28:10](466,470)th: <th>',
			'[28:10]>[28:16](470,476)#text: header',
			'[28:16]>[28:21](476,481)th: </th>',
			'[28:21]>[29:6](481,487)#text: ⏎→→→→→',
			'[29:6]>[29:10](487,491)td: <td>',
			'[29:10]>[29:14](491,495)#text: cell',
			'[29:14]>[29:19](495,500)td: </td>',
			'[29:19]>[30:5](500,505)#text: ⏎→→→→',
			'[30:5]>[30:10](505,510)tr: </tr>',
			'[30:10]>[31:4](510,514)#text: ⏎→→→',
			'[31:4]>[31:12](514,522)tbody: </tbody>',
			'[31:12]>[32:3](522,525)#text: ⏎→→',
			'[32:3]>[32:11](525,533)table: </table>',
			'[32:11]>[33:3](533,536)#text: ⏎→→',
			'[33:3]>[33:24](536,557)img: <img␣src="path/to"␣/>',
			'[33:24]>[36:3](557,580)#text: ⏎→→→→invalid-indent⏎⏎→→',
			'[36:3]>[37:31](580,629)#comment: <?template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">',
			'[37:31]>[37:35](629,633)#text: text',
			'[37:35]>[37:42](633,640)#invalid: </html>',
			'[37:42]>[41:35](640,703)#text: \'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">text',
			'[41:35]>[41:42](703,710)#invalid: </html>',
			"[41:42]>[44:3](710,720)#text: '⏎→→%>⏎⏎→→",
			'[44:3]>[44:14](720,731)#invalid: </expected>',
			'[44:14]>[45:3](731,734)#text: ⏎→→',
			'[45:3]>[45:8](734,739)div: <div>',
			'[45:8]>[47:2](739,752)#text: ⏎→text-node⏎→',
			'[47:2]>[47:9](752,759)body: </body>',
			'[47:9]>[48:2](759,761)#text: ⏎→',
			'[48:2]>[48:9](761,768)html: </html>',
			'[48:9]>[49:2](768,770)#text: ⏎→',
		]);
	});

	it('standard code', () => {
		const nodeList = HTMLParser.parse(`
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
		const map = HTMLParser.nodeListToDebugMaps(nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:12](2,12)template: <template>',
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:11](15,23)script: <script>',
			'[3:11]>[5:3](23,42)#text: ⏎→→→const␣i␣=␣0;⏎→→',
			'[5:3]>[5:12](42,51)script: </script>',
			'[5:12]>[6:3](51,54)#text: ⏎→→',
			'[6:3]>[6:18](54,69)#comment: <!comment-node>',
			'[6:18]>[7:3](69,72)#text: ⏎→→',
			'[7:3]>[7:24](72,93)#comment: <!--␣html-comment␣-->',
			'[7:24]>[8:3](93,96)#text: ⏎→→',
			'[8:3]>[8:8](96,101)div: <div>',
			'[8:8]>[10:3](101,120)#text: ⏎→→→text&amp;div⏎→→',
			'[10:3]>[10:9](120,126)div: </div>',
			'[10:9]>[11:3](126,129)#text: ⏎→→',
			'[11:3]>[11:10](129,136)table: <table>',
			'[11:10]>[12:4](136,140)#text: ⏎→→→',
			'[N/A]>[N/A](N/A)tbody: ',
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
			'[25:24]>[28:3](329,352)#text: ⏎→→→→invalid-indent⏎⏎→→',
			'[28:3]>[29:31](352,401)#comment: <?template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">',
			'[29:31]>[29:35](401,405)#text: text',
			'[29:35]>[29:42](405,412)#invalid: </html>',
			'[29:42]>[33:35](412,475)#text: \'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">text',
			'[33:35]>[33:42](475,482)#invalid: </html>',
			"[33:42]>[36:3](482,492)#text: '⏎→→%>⏎⏎→→",
			'[36:3]>[36:14](492,503)#invalid: </expected>',
			'[36:14]>[37:3](503,506)#text: ⏎→→',
			'[37:3]>[37:8](506,511)div: <div>',
			'[37:8]>[39:2](511,524)#text: ⏎→text-node⏎→',
			'[39:2]>[39:13](524,535)template: </template>',
			'[39:13]>[40:2](535,537)#text: ⏎→',
		]);
	});
});
