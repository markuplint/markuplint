import { MLASTNodeType, nodeListToDebugMaps } from '@markuplint/ml-ast';
import { isDocumentFragment, parse } from './';

describe('isDocumentFragment', () => {
	it('<!doctype>', () => {
		expect(isDocumentFragment('<!DOCTYPE html>')).toBe(false);
	});

	it('<!doctype> - 2', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		`),
		).toBe(false);
	});

	it('<!doctype> + <html>', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html>
		`),
		).toBe(false);
	});

	it('<!doctype> + <html></html>', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html></html>
		`),
		).toBe(false);
	});

	it('<!doctype> + <html> - 2', () => {
		expect(
			isDocumentFragment(`
		<html lang="ja">
		`),
		).toBe(false);
	});

	it('<!doctype> + <html></html> - 2', () => {
		expect(
			isDocumentFragment(`
		<html lang="ja"></html>
		`),
		).toBe(false);
	});

	it('<html></html>', () => {
		expect(isDocumentFragment('<html lang="ja"></html>')).toBe(false);
	});

	it('<html></html> - 2', () => {
		expect(isDocumentFragment('<html></html>')).toBe(false);
	});

	it('<body>', () => {
		expect(
			isDocumentFragment(`
		<body>
		`),
		).toBe(true);
	});

	it('<body></body>', () => {
		expect(isDocumentFragment('<body></body>')).toBe(true);
	});

	it('<div></div>', () => {
		expect(isDocumentFragment('<div></div>')).toBe(true);
	});

	it('<template></template>', () => {
		expect(isDocumentFragment('<template></template>')).toBe(true);
	});

	it('<head></head>', () => {
		expect(isDocumentFragment('<head></head>')).toBe(true);
	});
});

describe('parser', () => {
	it('<!DOCTYPE html>', () => {
		const doc = parse('<!DOCTYPE html>');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList.length).toBe(4);
	});

	it('<!DOCTYPE html> ', () => {
		const doc = parse('<!DOCTYPE html> ');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].nodeName).toBe('#text');
		expect(doc.nodeList[4].raw).toBe(' ');
		expect(doc.nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\n', () => {
		const doc = parse('<!DOCTYPE html>\n');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].nodeName).toBe('#text');
		expect(doc.nodeList[4].raw).toBe('\n');
		expect(doc.nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>text', () => {
		const doc = parse('<!DOCTYPE html>text');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[4].startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html> text', () => {
		const doc = parse('<!DOCTYPE html> text');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[4].raw).toBe(' text');
		expect(doc.nodeList[4].startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\ntext', () => {
		const doc = parse('<!DOCTYPE html>\ntext');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[4].raw).toBe('\ntext');
		expect(doc.nodeList[4].startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	it('<!DOCTYPE html>\\n<p>text', () => {
		const doc = parse('<!DOCTYPE html>\n<p>text');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].nodeName).toBe('#text');
		expect(doc.nodeList[5].nodeName).toBe('p');
		expect(doc.nodeList[6].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[6].raw).toBe('text');
		expect(doc.nodeList[6].startCol).toBe(4);
		expect(doc.nodeList.length).toBe(7);
	});

	it('<!DOCTYPE html><p>\\ntext', () => {
		const doc = parse('<!DOCTYPE html><p>\ntext');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].nodeName).toBe('p');
		expect(doc.nodeList[5].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[5].raw).toBe('\ntext');
		expect(doc.nodeList[5].startCol).toBe(19);
		expect(doc.nodeList.length).toBe(6);
	});

	it('<!DOCTYPE html>\\n<html>text', () => {
		const doc = parse('<!DOCTYPE html>\n<html>text');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('#text');
		expect(doc.nodeList[2].nodeName).toBe('html');
		expect(doc.nodeList[3].nodeName).toBe('head');
		expect(doc.nodeList[4].nodeName).toBe('body');
		expect(doc.nodeList[5].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[5].raw).toBe('text');
		expect(doc.nodeList[5].startCol).toBe(7);
		expect(doc.nodeList.length).toBe(6);
	});

	it('<!DOCTYPE html><html>\\ntext', () => {
		const doc = parse('<!DOCTYPE html><html>\ntext');
		expect(doc.nodeList[0].type).toBe(MLASTNodeType.Doctype);
		expect(doc.nodeList[1].nodeName).toBe('html');
		expect(doc.nodeList[2].nodeName).toBe('head');
		expect(doc.nodeList[3].nodeName).toBe('body');
		expect(doc.nodeList[4].type).toBe(MLASTNodeType.Text);
		expect(doc.nodeList[4].raw).toBe('\ntext');
		expect(doc.nodeList[4].startCol).toBe(22);
		expect(doc.nodeList.length).toBe(5);
	});

	it('empty code', () => {
		const doc = parse('');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	it('<html>', () => {
		const doc = parse('<html>');
		expect(doc.nodeList[0].nodeName).toBe('html');
		expect(doc.nodeList[1].nodeName).toBe('head');
		expect(doc.nodeList[2].nodeName).toBe('body');
		expect(doc.nodeList.length).toBe(3);
	});

	it('<html></body>', () => {
		const doc = parse('<html></body>');
		expect(doc.nodeList[0].nodeName).toBe('html');
		expect(doc.nodeList[1].nodeName).toBe('head');
		expect(doc.nodeList[2].nodeName).toBe('body');
		expect(doc.nodeList[3].nodeName).toBe('#text');
		expect(doc.nodeList[3].raw).toBe('</body>');
		expect(doc.nodeList.length).toBe(4);
	});

	it('text only', () => {
		const doc = parse('text');
		expect(doc.nodeList[0].nodeName).toBe('#text');
		expect(doc.nodeList[0].raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	it('<html>invalid-before-text<body>text</body>invalid-after-text</html>', () => {
		const doc = parse('<html>invalid-before-text<body>text</body>invalid-after-text</html>');
		expect(doc.nodeList[0].nodeName).toBe('html');
		expect(doc.nodeList[1].nodeName).toBe('head');
		expect(doc.nodeList[2].nodeName).toBe('body');
		expect(doc.nodeList[3].nodeName).toBe('#text');
		expect(doc.nodeList[4].nodeName).toBe('html');
		expect(doc.nodeList.length).toBe(5);
	});

	test('a element', () => {
		const r = parse('<div>text</div>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:10](5,9)#text: text',
			'[1:10]>[1:16](9,15)div: </div>',
		]);
	});

	it('standard code', () => {
		const doc = parse(`
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
		const map = nodeListToDebugMaps(doc.nodeList);
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
			"[37:31]>[45:3](629,734)#text: text</html>'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'<html␣attr=\"value\">text</html>'⏎→→%>⏎⏎→→</expected>⏎→→",
			'[45:3]>[45:8](734,739)div: <div>',
			'[45:8]>[47:2](739,752)#text: ⏎→text-node⏎→',
			'[47:2]>[47:9](752,759)body: </body>',
			'[47:9]>[48:2](759,761)#text: ⏎→',
			'[48:2]>[48:9](761,768)html: </html>',
			'[48:9]>[49:2](768,770)#text: ⏎→',
		]);
	});

	it('<template>', () => {
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
			"[29:31]>[37:3](401,506)#text: text</html>'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'<html␣attr=\"value\">text</html>'⏎→→%>⏎⏎→→</expected>⏎→→",
			'[37:3]>[37:8](506,511)div: <div>',
			'[37:8]>[39:2](511,524)#text: ⏎→text-node⏎→',
			'[39:2]>[39:13](524,535)template: </template>',
			'[39:13]>[40:2](535,537)#text: ⏎→',
		]);
	});

	it('<noscript>', () => {
		const doc = parse(`
	<noscript>
		<div>test</div>
		<expected>
		</expected2>
	</noscript>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:12](2,12)noscript: <noscript>',
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:8](15,20)div: <div>',
			'[3:8]>[3:12](20,24)#text: test',
			'[3:12]>[3:18](24,30)div: </div>',
			'[3:18]>[4:3](30,33)#text: ⏎→→',
			'[4:3]>[4:13](33,43)expected: <expected>',
			'[4:13]>[6:2](43,60)#text: ⏎→→</expected2>⏎→',
			'[6:2]>[6:13](60,71)noscript: </noscript>',
			'[6:13]>[7:2](71,73)#text: ⏎→',
		]);
	});

	it('<form>', () => {
		const doc = parse(`
	<div>
		<form novalidate>
			<input type="text" name="foo">
			<input type="checkbox" name="bar">
		</form>
	</div>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:7](2,7)div: <div>',
			'[2:7]>[3:3](7,10)#text: ⏎→→',
			'[3:3]>[3:20](10,27)form: <form␣novalidate>',
			'[3:20]>[4:4](27,31)#text: ⏎→→→',
			'[4:4]>[4:34](31,61)input: <input␣type="text"␣name="foo">',
			'[4:34]>[5:4](61,65)#text: ⏎→→→',
			'[5:4]>[5:38](65,99)input: <input␣type="checkbox"␣name="bar">',
			'[5:38]>[6:3](99,102)#text: ⏎→→',
			'[6:3]>[6:10](102,109)form: </form>',
			'[6:10]>[7:2](109,111)#text: ⏎→',
			'[7:2]>[7:8](111,117)div: </div>',
			'[7:8]>[8:2](117,119)#text: ⏎→',
		]);
	});

	it('<form> in <form>', () => {
		const doc = parse(`
	<form>
		<form novalidate>
			<input type="text" name="foo">
			<input type="checkbox" name="bar">
		</form>
	</form>
	`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:8](2,8)form: <form>',
			'[2:8]>[4:4](8,32)#text: ⏎→→<form␣novalidate>⏎→→→',
			'[4:4]>[4:34](32,62)input: <input␣type="text"␣name="foo">',
			'[4:34]>[5:4](62,66)#text: ⏎→→→',
			'[5:4]>[5:38](66,100)input: <input␣type="checkbox"␣name="bar">',
			'[5:38]>[6:3](100,103)#text: ⏎→→',
			'[6:3]>[6:10](103,110)form: </form>',
			'[6:10]>[8:2](110,121)#text: ⏎→</form>⏎→',
		]);
	});

	it('UUID', () => {
		const doc = parse('<html><head><title>title</title></head><body><div>test</div></body></html>');
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		// console.log(doc.nodeList.map((n, i) => `${i}: ${n.uuid} ${n.raw.trim()}`));

		// <html>
		expect(doc.nodeList[0].parentNode).toEqual(null);
		expect(doc.nodeList[0].prevNode).toEqual(null);
		expect(doc.nodeList[0].nextNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[0].pearNode.uuid).toEqual(doc.nodeList[11].uuid);

		// </html>
		expect(doc.nodeList[11].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[11].pearNode.uuid).toEqual(doc.nodeList[0].uuid);

		// <head>
		// @ts-ignore
		expect(doc.nodeList[1].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[1].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[1].nextNode.uuid).toEqual(doc.nodeList[6].uuid);
		// @ts-ignore
		expect(doc.nodeList[1].pearNode.uuid).toEqual(doc.nodeList[5].uuid);

		// </head>
		// @ts-ignore
		expect(doc.nodeList[5].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[5].pearNode.uuid).toEqual(doc.nodeList[1].uuid);

		// <body>
		// @ts-ignore
		expect(doc.nodeList[6].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[6].prevNode.uuid).toEqual(doc.nodeList[1].uuid);
		// @ts-ignore
		expect(doc.nodeList[6].nextNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[6].pearNode.uuid).toEqual(doc.nodeList[10].uuid);

		// </body>
		// @ts-ignore
		expect(doc.nodeList[10].parentNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[10].pearNode.uuid).toEqual(doc.nodeList[6].uuid);
	});

	it('UUID', () => {
		const doc = parse(`
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>Document</title>
</head>
<body>
	<h1>Title</h1>
</body>
</html>
`);
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		// console.log(doc.nodeList.map((n, i) => `${i}: ${n.uuid} ${n.raw.trim()}`));

		// #text ⏎
		expect(doc.nodeList[0].parentNode).toEqual(null);
		expect(doc.nodeList[0].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[0].nextNode.uuid).toEqual(doc.nodeList[1].uuid);

		// Doctype <!DOCTYPE␣html>
		expect(doc.nodeList[1].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[1].prevNode.uuid).toEqual(doc.nodeList[0].uuid);
		// @ts-ignore
		expect(doc.nodeList[1].nextNode.uuid).toEqual(doc.nodeList[2].uuid);

		// #text ⏎
		expect(doc.nodeList[2].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[2].prevNode.uuid).toEqual(doc.nodeList[1].uuid);
		// @ts-ignore
		expect(doc.nodeList[2].nextNode.uuid).toEqual(doc.nodeList[3].uuid);

		// html <html␣lang="en">
		expect(doc.nodeList[3].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[3].prevNode.uuid).toEqual(doc.nodeList[2].uuid);
		// @ts-ignore
		expect(doc.nodeList[3].nextNode.uuid).toEqual(doc.nodeList[28].uuid);
		// @ts-ignore
		expect(doc.nodeList[3].pearNode.uuid).toEqual(doc.nodeList[27].uuid);

		{
			// @ts-ignore
			expect(doc.nodeList[3].childNodes[0].uuid).toEqual(doc.nodeList[4].uuid);
			// @ts-ignore
			expect(doc.nodeList[3].childNodes[1].uuid).toEqual(doc.nodeList[5].uuid);
			// @ts-ignore
			expect(doc.nodeList[3].childNodes[2].uuid).toEqual(doc.nodeList[18].uuid);
			// @ts-ignore
			expect(doc.nodeList[3].childNodes[3].uuid).toEqual(doc.nodeList[19].uuid);
			// @ts-ignore
			expect(doc.nodeList[3].childNodes[4].uuid).toEqual(doc.nodeList[26].uuid);
		}

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[4].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[4].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[4].nextNode.uuid).toEqual(doc.nodeList[5].uuid);

		// head <head>
		// @ts-ignore
		expect(doc.nodeList[5].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[5].prevNode.uuid).toEqual(doc.nodeList[4].uuid);
		// @ts-ignore
		expect(doc.nodeList[5].nextNode.uuid).toEqual(doc.nodeList[18].uuid);
		// @ts-ignore
		expect(doc.nodeList[5].pearNode.uuid).toEqual(doc.nodeList[17].uuid);

		{
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[0].uuid).toEqual(doc.nodeList[6].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[1].uuid).toEqual(doc.nodeList[7].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[2].uuid).toEqual(doc.nodeList[8].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[3].uuid).toEqual(doc.nodeList[9].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[4].uuid).toEqual(doc.nodeList[10].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[5].uuid).toEqual(doc.nodeList[11].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[6].uuid).toEqual(doc.nodeList[12].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[7].uuid).toEqual(doc.nodeList[13].uuid);
			// @ts-ignore
			expect(doc.nodeList[5].childNodes[8].uuid).toEqual(doc.nodeList[16].uuid);
		}

		// #text ⏎→
		// @ts-ignore
		expect(doc.nodeList[6].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[6].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[6].nextNode.uuid).toEqual(doc.nodeList[7].uuid);

		// meta <meta␣charset="UTF-8">
		// @ts-ignore
		expect(doc.nodeList[7].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[7].prevNode.uuid).toEqual(doc.nodeList[6].uuid);
		// @ts-ignore
		expect(doc.nodeList[7].nextNode.uuid).toEqual(doc.nodeList[8].uuid);
		// @ts-ignore
		expect(doc.nodeList[7].pearNode).toEqual(null);

		// #text ⏎→
		// @ts-ignore
		expect(doc.nodeList[8].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[8].prevNode.uuid).toEqual(doc.nodeList[7].uuid);
		// @ts-ignore
		expect(doc.nodeList[8].nextNode.uuid).toEqual(doc.nodeList[9].uuid);

		// meta <meta␣name="viewport"␣content="width=device-width,␣initial-scale=1.0">
		// @ts-ignore
		expect(doc.nodeList[9].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[9].prevNode.uuid).toEqual(doc.nodeList[8].uuid);
		// @ts-ignore
		expect(doc.nodeList[9].nextNode.uuid).toEqual(doc.nodeList[10].uuid);
		// @ts-ignore
		expect(doc.nodeList[9].pearNode).toEqual(null);

		// #text ⏎→
		// @ts-ignore
		expect(doc.nodeList[10].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[10].prevNode.uuid).toEqual(doc.nodeList[9].uuid);
		// @ts-ignore
		expect(doc.nodeList[10].nextNode.uuid).toEqual(doc.nodeList[11].uuid);

		// meta <meta␣http-equiv="X-UA-Compatible"␣content="ie=edge">
		// @ts-ignore
		expect(doc.nodeList[11].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[11].prevNode.uuid).toEqual(doc.nodeList[10].uuid);
		// @ts-ignore
		expect(doc.nodeList[11].nextNode.uuid).toEqual(doc.nodeList[12].uuid);
		// @ts-ignore
		expect(doc.nodeList[11].pearNode).toEqual(null);

		// #text ⏎→
		// @ts-ignore
		expect(doc.nodeList[12].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[12].prevNode.uuid).toEqual(doc.nodeList[11].uuid);
		// @ts-ignore
		expect(doc.nodeList[12].nextNode.uuid).toEqual(doc.nodeList[13].uuid);

		// meta <title>
		// @ts-ignore
		expect(doc.nodeList[13].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[13].prevNode.uuid).toEqual(doc.nodeList[12].uuid);
		// @ts-ignore
		expect(doc.nodeList[13].nextNode.uuid).toEqual(doc.nodeList[16].uuid);
		// @ts-ignore
		expect(doc.nodeList[13].pearNode.uuid).toEqual(doc.nodeList[15].uuid);

		{
			// @ts-ignore
			expect(doc.nodeList[13].childNodes[0].uuid).toEqual(doc.nodeList[14].uuid);
		}

		// #text Document
		// @ts-ignore
		expect(doc.nodeList[14].parentNode.uuid).toEqual(doc.nodeList[13].uuid);
		// @ts-ignore
		expect(doc.nodeList[14].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[14].nextNode).toEqual(null);

		// meta </title>
		// @ts-ignore
		expect(doc.nodeList[15].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[15].prevNode.uuid).toEqual(doc.nodeList[12].uuid);
		// @ts-ignore
		expect(doc.nodeList[15].nextNode.uuid).toEqual(doc.nodeList[16].uuid);
		// @ts-ignore
		expect(doc.nodeList[15].pearNode.uuid).toEqual(doc.nodeList[13].uuid);

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[16].parentNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[16].prevNode.uuid).toEqual(doc.nodeList[13].uuid);
		// @ts-ignore
		expect(doc.nodeList[16].nextNode).toEqual(null);

		// meta </head>
		// @ts-ignore
		expect(doc.nodeList[17].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[17].prevNode.uuid).toEqual(doc.nodeList[4].uuid);
		// @ts-ignore
		expect(doc.nodeList[17].nextNode.uuid).toEqual(doc.nodeList[18].uuid);
		// @ts-ignore
		expect(doc.nodeList[17].pearNode.uuid).toEqual(doc.nodeList[5].uuid);

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[18].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[18].prevNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[18].nextNode.uuid).toEqual(doc.nodeList[19].uuid);

		// head <body>
		// @ts-ignore
		expect(doc.nodeList[19].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[19].prevNode.uuid).toEqual(doc.nodeList[18].uuid);
		// @ts-ignore
		expect(doc.nodeList[19].nextNode.uuid).toEqual(doc.nodeList[26].uuid);
		// @ts-ignore
		expect(doc.nodeList[19].pearNode.uuid).toEqual(doc.nodeList[25].uuid);

		{
			// @ts-ignore
			expect(doc.nodeList[19].childNodes[0].uuid).toEqual(doc.nodeList[20].uuid);
			// @ts-ignore
			expect(doc.nodeList[19].childNodes[1].uuid).toEqual(doc.nodeList[21].uuid);
			// @ts-ignore
			expect(doc.nodeList[19].childNodes[2].uuid).toEqual(doc.nodeList[24].uuid);
		}

		// #text ⏎→
		// @ts-ignore
		expect(doc.nodeList[20].parentNode.uuid).toEqual(doc.nodeList[19].uuid);
		// @ts-ignore
		expect(doc.nodeList[20].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[20].nextNode.uuid).toEqual(doc.nodeList[21].uuid);

		// head <h1>
		// @ts-ignore
		expect(doc.nodeList[21].parentNode.uuid).toEqual(doc.nodeList[19].uuid);
		// @ts-ignore
		expect(doc.nodeList[21].prevNode.uuid).toEqual(doc.nodeList[20].uuid);
		// @ts-ignore
		expect(doc.nodeList[21].nextNode.uuid).toEqual(doc.nodeList[24].uuid);
		// @ts-ignore
		expect(doc.nodeList[21].pearNode.uuid).toEqual(doc.nodeList[23].uuid);

		{
			// @ts-ignore
			expect(doc.nodeList[21].childNodes[0].uuid).toEqual(doc.nodeList[22].uuid);
		}

		// #text Title
		// @ts-ignore
		expect(doc.nodeList[22].parentNode.uuid).toEqual(doc.nodeList[21].uuid);
		// @ts-ignore
		expect(doc.nodeList[22].prevNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[22].nextNode).toEqual(null);

		// head </h1>
		// @ts-ignore
		expect(doc.nodeList[23].parentNode.uuid).toEqual(doc.nodeList[19].uuid);
		// @ts-ignore
		expect(doc.nodeList[23].prevNode.uuid).toEqual(doc.nodeList[20].uuid);
		// @ts-ignore
		expect(doc.nodeList[23].nextNode.uuid).toEqual(doc.nodeList[24].uuid);
		// @ts-ignore
		expect(doc.nodeList[23].pearNode.uuid).toEqual(doc.nodeList[21].uuid);

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[24].parentNode.uuid).toEqual(doc.nodeList[19].uuid);
		// @ts-ignore
		expect(doc.nodeList[24].prevNode.uuid).toEqual(doc.nodeList[21].uuid);
		// @ts-ignore
		expect(doc.nodeList[24].nextNode).toEqual(null);

		// </body>
		// @ts-ignore
		expect(doc.nodeList[25].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[25].prevNode.uuid).toEqual(doc.nodeList[18].uuid);
		// @ts-ignore
		expect(doc.nodeList[25].nextNode.uuid).toEqual(doc.nodeList[26].uuid);
		// @ts-ignore
		expect(doc.nodeList[25].pearNode.uuid).toEqual(doc.nodeList[19].uuid);

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[26].parentNode.uuid).toEqual(doc.nodeList[3].uuid);
		// @ts-ignore
		expect(doc.nodeList[26].prevNode.uuid).toEqual(doc.nodeList[25].uuid);
		// @ts-ignore
		expect(doc.nodeList[26].nextNode).toEqual(null);

		// </html>
		expect(doc.nodeList[27].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[27].prevNode.uuid).toEqual(doc.nodeList[2].uuid);
		// @ts-ignore
		expect(doc.nodeList[27].nextNode.uuid).toEqual(doc.nodeList[28].uuid);
		// @ts-ignore
		expect(doc.nodeList[27].pearNode.uuid).toEqual(doc.nodeList[3].uuid);

		// #text ⏎
		// @ts-ignore
		expect(doc.nodeList[28].parentNode).toEqual(null);
		// @ts-ignore
		expect(doc.nodeList[28].prevNode.uuid).toEqual(doc.nodeList[27].uuid);
		// @ts-ignore
		expect(doc.nodeList[28].nextNode).toEqual(null);
	});

	it('UUID', () => {
		const doc = parse(`<html>
<body></body>
</html>`);
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);

		// @ts-ignore
		expect(doc.nodeList[3].nextNode.uuid).toEqual(doc.nodeList[5].uuid);
		// @ts-ignore
		expect(doc.nodeList[4].nextNode.uuid).toEqual(doc.nodeList[5].uuid);
	});

	it('Offset', () => {
		const doc = parse('<span>\n\t\t\t<img src="path/to">\n\t\t</span>\n\t\t\t', 15, 2, 2);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[3:3]>[3:9](15,21)span: <span>',
			'[3:9]>[4:4](21,25)#text: ⏎→→→',
			'[4:6]>[4:25](25,44)img: <img␣src="path/to">',
			'[4:25]>[5:3](44,47)#text: ⏎→→',
			'[5:5]>[5:12](47,54)span: </span>',
			'[5:12]>[6:4](54,58)#text: ⏎→→→',
		]);

		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].startOffset).toBe(29);
		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].endOffset).toBe(43);
		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].startLine).toBe(4);
		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].endLine).toBe(4);
		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].startCol).toBe(10);
		// @ts-ignore
		expect(doc.nodeList[2].attributes[0].endCol).toBe(24);
	});
});
