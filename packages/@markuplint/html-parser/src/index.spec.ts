import type { MLASTElement, MLASTInvalid } from '@markuplint/ml-ast';

import { nodeListToDebugMaps, attributesToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { isDocumentFragment } from './is-document-fragment.js';

import { parser } from './index.js';

const parse = parser.parse.bind(parser);

describe('isDocumentFragment', () => {
	test('<!doctype>', () => {
		expect(isDocumentFragment('<!DOCTYPE html>')).toBe(false);
	});

	test('<!doctype> - 2', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		`),
		).toBe(false);
	});

	test('<!doctype> + <html>', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html>
		`),
		).toBe(false);
	});

	test('<!doctype> + <html></html>', () => {
		expect(
			isDocumentFragment(`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">
		<html></html>
		`),
		).toBe(false);
	});

	test('<!doctype> + <html> - 2', () => {
		expect(
			isDocumentFragment(`
		<html lang="ja">
		`),
		).toBe(false);
	});

	test('<!doctype> + <html></html> - 2', () => {
		expect(
			isDocumentFragment(`
		<html lang="ja"></html>
		`),
		).toBe(false);
	});

	test('<html></html>', () => {
		expect(isDocumentFragment('<html lang="ja"></html>')).toBe(false);
	});

	test('<html></html> - 2', () => {
		expect(isDocumentFragment('<html></html>')).toBe(false);
	});

	test('<body>', () => {
		expect(
			isDocumentFragment(`
		<body>
		`),
		).toBe(true);
	});

	test('<body></body>', () => {
		expect(isDocumentFragment('<body></body>')).toBe(true);
	});

	test('<div></div>', () => {
		expect(isDocumentFragment('<div></div>')).toBe(true);
	});

	test('<template></template>', () => {
		expect(isDocumentFragment('<template></template>')).toBe(true);
	});

	test('<head></head>', () => {
		expect(isDocumentFragment('<head></head>')).toBe(true);
	});
});

describe('parser', () => {
	test('<!DOCTYPE html>', () => {
		const doc = parse('<!DOCTYPE html>');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList.length).toBe(4);
	});

	test('<!DOCTYPE html> ', () => {
		const doc = parse('<!DOCTYPE html> ');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.nodeName).toBe('#text');
		expect(doc.nodeList[4]?.raw).toBe(' ');
		expect(doc.nodeList.length).toBe(5);
	});

	test('<!DOCTYPE html>\\n', () => {
		const doc = parse('<!DOCTYPE html>\n');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.nodeName).toBe('#text');
		expect(doc.nodeList[4]?.raw).toBe('\n');
		expect(doc.nodeList.length).toBe(5);
	});

	test('<!DOCTYPE html>text', () => {
		const doc = parse('<!DOCTYPE html>text');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.type).toBe('text');
		expect(doc.nodeList[4]?.startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	test('<!DOCTYPE html> text', () => {
		const doc = parse('<!DOCTYPE html> text');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.type).toBe('text');
		expect(doc.nodeList[4]?.raw).toBe(' text');
		expect(doc.nodeList[4]?.startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	test('<!DOCTYPE html>\\ntext', () => {
		const doc = parse('<!DOCTYPE html>\ntext');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.type).toBe('text');
		expect(doc.nodeList[4]?.raw).toBe('\ntext');
		expect(doc.nodeList[4]?.startCol).toBe(16);
		expect(doc.nodeList.length).toBe(5);
	});

	test('<!DOCTYPE html>\\n<p>text', () => {
		const doc = parse('<!DOCTYPE html>\n<p>text');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.nodeName).toBe('#text');
		expect(doc.nodeList[5]?.nodeName).toBe('p');
		expect(doc.nodeList[6]?.type).toBe('text');
		expect(doc.nodeList[6]?.raw).toBe('text');
		expect(doc.nodeList[6]?.startCol).toBe(4);
		expect(doc.nodeList.length).toBe(7);
	});

	test('<!DOCTYPE html><p>\\ntext', () => {
		const doc = parse('<!DOCTYPE html><p>\ntext');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.nodeName).toBe('p');
		expect(doc.nodeList[5]?.type).toBe('text');
		expect(doc.nodeList[5]?.raw).toBe('\ntext');
		expect(doc.nodeList[5]?.startCol).toBe(19);
		expect(doc.nodeList.length).toBe(6);
	});

	test('<!DOCTYPE html>\\n<html>text', () => {
		const doc = parse('<!DOCTYPE html>\n<html>text');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('#text');
		expect(doc.nodeList[2]?.nodeName).toBe('html');
		expect(doc.nodeList[3]?.nodeName).toBe('head');
		expect(doc.nodeList[4]?.nodeName).toBe('body');
		expect(doc.nodeList[5]?.type).toBe('text');
		expect(doc.nodeList[5]?.raw).toBe('text');
		expect(doc.nodeList[5]?.startCol).toBe(7);
		expect(doc.nodeList.length).toBe(6);
	});

	test('<!DOCTYPE html><html>\\ntext', () => {
		const doc = parse('<!DOCTYPE html><html>\ntext');
		expect(doc.nodeList[0]?.type).toBe('doctype');
		expect(doc.nodeList[1]?.nodeName).toBe('html');
		expect(doc.nodeList[2]?.nodeName).toBe('head');
		expect(doc.nodeList[3]?.nodeName).toBe('body');
		expect(doc.nodeList[4]?.type).toBe('text');
		expect(doc.nodeList[4]?.raw).toBe('\ntext');
		expect(doc.nodeList[4]?.startCol).toBe(22);
		expect(doc.nodeList.length).toBe(5);
	});

	test('empty code', () => {
		const doc = parse('');
		expect(doc.nodeList).toStrictEqual([]);
		expect(doc.nodeList.length).toBe(0);
	});

	test('<html>', () => {
		const doc = parse('<html>');
		expect(doc.nodeList[0]?.nodeName).toBe('html');
		expect(doc.nodeList[1]?.nodeName).toBe('head');
		expect(doc.nodeList[2]?.nodeName).toBe('body');
		expect(doc.nodeList.length).toBe(3);
	});

	test('<html></body>', () => {
		const doc = parse('<html></body>');
		expect(doc.nodeList[0]?.nodeName).toBe('html');
		expect(doc.nodeList[1]?.nodeName).toBe('head');
		expect(doc.nodeList[2]?.nodeName).toBe('body');
		const invalidNode = doc.nodeList[3] as MLASTInvalid;
		expect(invalidNode.type).toBe('invalid');
		expect(invalidNode.kind).toBe('endtag');
		expect(invalidNode.nodeName).toBe('#invalid');
		expect(invalidNode.raw).toBe('</body>');
		expect(invalidNode.isBogus).toBeTruthy();
		expect(doc.nodeList.length).toBe(4);
	});

	test('text only', () => {
		const doc = parse('text');
		expect(doc.nodeList[0]?.nodeName).toBe('#text');
		expect(doc.nodeList[0]?.raw).toBe('text');
		expect(doc.nodeList.length).toBe(1);
	});

	test('<html>invalid-before-text<body>text</body>invalid-after-text</html>', () => {
		const doc = parse('<html>invalid-before-text<body>text</body>invalid-after-text</html>');
		expect(doc.nodeList[0]?.nodeName).toBe('html');
		expect(doc.nodeList[1]?.nodeName).toBe('head');
		expect(doc.nodeList[2]?.nodeName).toBe('body');
		expect(doc.nodeList[3]?.nodeName).toBe('#text');
		expect(doc.nodeList[4]?.nodeName).toBe('html');
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

	test('<head><title>TITLE</title></head>', () => {
		const doc = parse('<head><title>TITLE</title></head>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)head: <head>',
			'[1:7]>[1:14](6,13)title: <title>',
			'[1:14]>[1:19](13,18)#text: TITLE',
			'[1:19]>[1:27](18,26)title: </title>',
			'[1:27]>[1:34](26,33)head: </head>',
		]);
	});

	test('<body><p>TEXT</p></body>', () => {
		const doc = parse('<body><p>TEXT</p></body>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)body: <body>',
			'[1:7]>[1:10](6,9)p: <p>',
			'[1:10]>[1:14](9,13)#text: TEXT',
			'[1:14]>[1:18](13,17)p: </p>',
			'[1:18]>[1:25](17,24)body: </body>',
		]);
	});

	test('<head><title>TITLE</title></head><body><p>TEXT</p></body>', () => {
		const doc = parse('<head><title>TITLE</title></head><body><p>TEXT</p></body>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)head: <head>',
			'[1:7]>[1:14](6,13)title: <title>',
			'[1:14]>[1:19](13,18)#text: TITLE',
			'[1:19]>[1:27](18,26)title: </title>',
			'[1:27]>[1:34](26,33)head: </head>',
			'[1:34]>[1:40](33,39)body: <body>',
			'[1:40]>[1:43](39,42)p: <p>',
			'[1:43]>[1:47](42,46)#text: TEXT',
			'[1:47]>[1:51](46,50)p: </p>',
			'[1:51]>[1:58](50,57)body: </body>',
		]);
	});

	test('<head><title>TITLE</title>', () => {
		const doc = parse('<head><title>TITLE</title>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)head: <head>',
			'[1:7]>[1:14](6,13)title: <title>',
			'[1:14]>[1:19](13,18)#text: TITLE',
			'[1:19]>[1:27](18,26)title: </title>',
		]);
	});

	test('<body><p>TEXT</p>', () => {
		const doc = parse('<body><p>TEXT</p>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)body: <body>',
			'[1:7]>[1:10](6,9)p: <p>',
			'[1:10]>[1:14](9,13)#text: TEXT',
			'[1:14]>[1:18](13,17)p: </p>',
		]);
	});

	test('<head><title>TITLE</title><body><p>TEXT</p>', () => {
		const doc = parse('<head><title>TITLE</title><body><p>TEXT</p>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:7](0,6)head: <head>',
			'[1:7]>[1:14](6,13)title: <title>',
			'[1:14]>[1:19](13,18)#text: TITLE',
			'[1:19]>[1:27](18,26)title: </title>',
			'[1:27]>[1:33](26,32)body: <body>',
			'[1:33]>[1:36](32,35)p: <p>',
			'[1:36]>[1:40](35,39)#text: TEXT',
			'[1:40]>[1:44](39,43)p: </p>',
		]);
	});

	test('<div></p></br></span></div>', () => {
		const doc = parse('<div></p></br></span></div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			// @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
			// An end tag whose tag name is "p"
			// If the stack of open elements does not have a p element in button scope, then this is a parse error;
			// insert an HTML element for a "p" start tag token with no attributes.
			'[1:6]>[1:6](5,5)p(👻): ',
			// An end tag whose tag name is "br"
			// Parse error. Drop the attributes from the token,
			// and act as described in the next entry;
			// i.e. act as if this was a "br" start tag token with no attributes,
			// rather than the end tag token that it actually is.
			'[1:6]>[1:6](5,5)br(👻): ',
			'[1:6]>[1:10](5,9)#invalid(👿): </p>',
			'[1:10]>[1:15](9,14)#invalid(👿): </br>',
			'[1:15]>[1:22](14,21)#invalid(👿): </span>',
			'[1:22]>[1:28](21,27)div: </div>',
		]);
	});

	test('<div></p></br><p></span></p></div>', () => {
		const doc = parse('<div></p></br><p></span></p></div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			// @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
			// An end tag whose tag name is "p"
			// If the stack of open elements does not have a p element in button scope, then this is a parse error;
			// insert an HTML element for a "p" start tag token with no attributes.
			'[1:6]>[1:6](5,5)p(👻): ',
			// An end tag whose tag name is "br"
			// Parse error. Drop the attributes from the token,
			// and act as described in the next entry;
			// i.e. act as if this was a "br" start tag token with no attributes,
			// rather than the end tag token that it actually is.
			'[1:6]>[1:6](5,5)br(👻): ',
			'[1:6]>[1:10](5,9)#invalid(👿): </p>',
			'[1:10]>[1:15](9,14)#invalid(👿): </br>',
			'[1:15]>[1:18](14,17)p: <p>',
			'[1:18]>[1:25](17,24)#invalid(👿): </span>',
			'[1:25]>[1:29](24,28)p: </p>',
			'[1:29]>[1:35](28,34)div: </div>',
		]);
	});

	test('Full HTML', () => {
		const doc = parse(`<!DOCTYPE html>
<html lang="en">
	<head>
		<meta />
	</head>
	<body></body>
</html>
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:16](0,15)#doctype: <!DOCTYPE␣html>',
			'[1:16]>[2:1](15,16)#text: ⏎',
			'[2:1]>[2:17](16,32)html: <html␣lang="en">',
			'[2:17]>[3:2](32,34)#text: ⏎→',
			'[3:2]>[3:8](34,40)head: <head>',
			'[3:8]>[4:3](40,43)#text: ⏎→→',
			'[4:3]>[4:11](43,51)meta: <meta␣/>',
			'[4:11]>[5:2](51,53)#text: ⏎→',
			'[5:2]>[5:9](53,60)head: </head>',
			'[5:9]>[6:2](60,62)#text: ⏎→',
			'[6:2]>[6:8](62,68)body: <body>',
			'[6:8]>[6:15](68,75)body: </body>',
			'[6:15]>[7:1](75,76)#text: ⏎',
			'[7:1]>[7:8](76,83)html: </html>',
			'[7:8]>[8:1](83,84)#text: ⏎',
		]);
	});

	test('standard code', () => {
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
			'[13:3]>[13:12](270,279)script: </script>',
			'[13:12]>[14:3](279,282)#text: ⏎→→',
			'[14:3]>[14:18](282,297)#comment(👿): <!comment-node>',
			'[14:18]>[15:3](297,300)#text: ⏎→→',
			'[15:3]>[15:24](300,321)#comment: <!--␣html-comment␣-->',
			'[15:24]>[16:3](321,324)#text: ⏎→→',
			'[16:3]>[16:8](324,329)div: <div>',
			'[16:8]>[18:3](329,348)#text: ⏎→→→text&amp;div⏎→→',
			'[18:3]>[18:9](348,354)div: </div>',
			'[18:9]>[19:3](354,357)#text: ⏎→→',
			'[19:3]>[19:10](357,364)table: <table>',
			'[19:10]>[20:4](364,368)#text: ⏎→→→',
			'[20:4]>[20:4](368,368)tbody(👻): ',
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
			'[36:3]>[37:31](580,629)#comment(👿): <?template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">',
			"[37:31]>[45:3](629,734)#text: text</html>'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'<html␣attr=\"value\">text</html>'⏎→→%>⏎⏎→→</expected>⏎→→",
			'[45:3]>[45:8](734,739)div: <div>',
			'[45:8]>[47:2](739,752)#text: ⏎→text-node⏎→',
			'[47:2]>[47:9](752,759)#invalid(👿): </body>',
			'[47:9]>[48:2](759,761)#text: ⏎→',
			'[48:2]>[48:9](761,768)#invalid(👿): </html>',
			'[48:9]>[49:2](768,770)#text: ⏎→',
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
			'[1:1]>[2:2](0,2)#text: ⏎→',
			'[2:2]>[2:12](2,12)template: <template>',
			'[2:12]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:11](15,23)script: <script>',
			'[5:3]>[5:12](42,51)script: </script>',
			'[5:12]>[6:3](51,54)#text: ⏎→→',
			'[6:3]>[6:18](54,69)#comment(👿): <!comment-node>',
			'[6:18]>[7:3](69,72)#text: ⏎→→',
			'[7:3]>[7:24](72,93)#comment: <!--␣html-comment␣-->',
			'[7:24]>[8:3](93,96)#text: ⏎→→',
			'[8:3]>[8:8](96,101)div: <div>',
			'[8:8]>[10:3](101,120)#text: ⏎→→→text&amp;div⏎→→',
			'[10:3]>[10:9](120,126)div: </div>',
			'[10:9]>[11:3](126,129)#text: ⏎→→',
			'[11:3]>[11:10](129,136)table: <table>',
			'[11:10]>[12:4](136,140)#text: ⏎→→→',
			'[12:4]>[12:4](140,140)tbody(👻): ',
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
			'[28:3]>[29:31](352,401)#comment(👿): <?template␣engine;⏎→→→$var␣=␣\'<html␣attr="value">',
			"[29:31]>[37:3](401,506)#text: text</html>'⏎→→?>⏎⏎→→<%template␣engine;⏎→→→$var␣=␣'<html␣attr=\"value\">text</html>'⏎→→%>⏎⏎→→</expected>⏎→→",
			'[37:3]>[37:8](506,511)div: <div>',
			'[37:8]>[39:2](511,524)#text: ⏎→text-node⏎→',
			'[39:2]>[39:13](524,535)template: </template>',
			'[39:13]>[40:2](535,537)#text: ⏎→',
		]);
	});

	test('<noscript>', () => {
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
			'[4:13]>[5:3](43,46)#text: ⏎→→',
			'[5:3]>[5:15](46,58)#invalid(👿): </expected2>',
			'[5:15]>[6:2](58,60)#text: ⏎→',
			'[6:2]>[6:13](60,71)noscript: </noscript>',
			'[6:13]>[7:2](71,73)#text: ⏎→',
		]);
	});

	/**
	 * https://github.com/markuplint/markuplint/issues/219
	 */
	test('<noscript> (Issue: #219)', () => {
		const doc = parse('<html><body><noscript data-xxx><iframe ></iframe></noscript></body></html>');
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:7](0,6)html: <html>',
			'[1:7]>[1:7](6,6)head(👻): ',
			'[1:7]>[1:13](6,12)body: <body>',
			'[1:13]>[1:32](12,31)noscript: <noscript␣data-xxx>',
			'[1:32]>[1:41](31,40)iframe: <iframe␣>',
			'[1:41]>[1:50](40,49)iframe: </iframe>',
			'[1:50]>[1:61](49,60)noscript: </noscript>',
			'[1:61]>[1:68](60,67)body: </body>',
			'[1:68]>[1:75](67,74)html: </html>',
		]);
	});

	/**
	 * https://github.com/markuplint/markuplint/issues/737
	 */
	test('<noscript> (Issue: #737)', () => {
		const doc = parse('<html><body><noscript>\r\n<div>text</div>\r\n</noscript></body></html>');
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:7](0,6)html: <html>',
			'[1:7]>[1:7](6,6)head(👻): ',
			'[1:7]>[1:13](6,12)body: <body>',
			'[1:13]>[1:23](12,22)noscript: <noscript>',
			'[1:23]>[2:1](22,24)#text: ␣⏎',
			'[2:1]>[2:6](24,29)div: <div>',
			'[2:6]>[2:10](29,33)#text: text',
			'[2:10]>[2:16](33,39)div: </div>',
			'[2:16]>[3:1](39,41)#text: ␣⏎',
			'[3:1]>[3:12](41,52)noscript: </noscript>',
			'[3:12]>[3:19](52,59)body: </body>',
			'[3:19]>[3:26](59,66)html: </html>',
		]);
	});

	test('<form>', () => {
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

	test('<form> in <form>', () => {
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
			'[6:10]>[7:2](110,112)#text: ⏎→',
			'[7:2]>[7:9](112,119)#invalid(👿): </form>',
			'[7:9]>[8:2](119,121)#text: ⏎→',
		]);
	});

	test('UUID', () => {
		const doc = parse('<html><head><title>title</title></head><body><div>test</div></body></html>');
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);
		// console.log(doc.nodeList.map((n, i) => `${i}: ${n.uuid} ${n.raw.trim()}`));

		// <html>
		expect(doc.nodeList[0]?.parentNode).toEqual(null);

		// </html>
		expect(doc.nodeList[11]?.parentNode).toEqual(null);

		// <head>
		expect(doc.nodeList[1]?.parentNode?.uuid).toEqual(doc.nodeList[0]?.uuid);

		// </head>
		expect(doc.nodeList[5]?.parentNode?.uuid).toEqual(doc.nodeList[0]?.uuid);

		// <body>
		expect(doc.nodeList[6]?.parentNode?.uuid).toEqual(doc.nodeList[0]?.uuid);

		// </body>
		expect(doc.nodeList[10]?.parentNode?.uuid).toEqual(doc.nodeList[0]?.uuid);
	});

	test('UUID', () => {
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
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			/* 00 */ '[1:1]>[2:1](0,1)#text: ⏎',
			/* 01 */ '[2:1]>[2:16](1,16)#doctype: <!DOCTYPE␣html>',
			/* 02 */ '[2:16]>[3:1](16,17)#text: ⏎',
			/* 03 */ '[3:1]>[3:17](17,33)html: <html␣lang="en">',
			/* 04 */ '[3:17]>[4:1](33,34)#text: ⏎',
			/* 05 */ '[4:1]>[4:7](34,40)head: <head>',
			/* 06 */ '[4:7]>[5:2](40,42)#text: ⏎→',
			/* 07 */ '[5:2]>[5:24](42,64)meta: <meta␣charset="UTF-8">',
			/* 08 */ '[5:24]>[6:2](64,66)#text: ⏎→',
			/* 09 */ '[6:2]>[6:72](66,136)meta: <meta␣name="viewport"␣content="width=device-width,␣initial-scale=1.0">',
			/* 10 */ '[6:72]>[7:2](136,138)#text: ⏎→',
			/* 11 */ '[7:2]>[7:55](138,191)meta: <meta␣http-equiv="X-UA-Compatible"␣content="ie=edge">',
			/* 12 */ '[7:55]>[8:2](191,193)#text: ⏎→',
			/* 13 */ '[8:2]>[8:9](193,200)title: <title>',
			/* 14 */ '[8:9]>[8:17](200,208)#text: Document',
			/* 15 */ '[8:17]>[8:25](208,216)title: </title>',
			/* 16 */ '[8:25]>[9:1](216,217)#text: ⏎',
			/* 17 */ '[9:1]>[9:8](217,224)head: </head>',
			/* 18 */ '[9:8]>[10:1](224,225)#text: ⏎',
			/* 19 */ '[10:1]>[10:7](225,231)body: <body>',
			/* 20 */ '[10:7]>[11:2](231,233)#text: ⏎→',
			/* 21 */ '[11:2]>[11:6](233,237)h1: <h1>',
			/* 22 */ '[11:6]>[11:11](237,242)#text: Title',
			/* 23 */ '[11:11]>[11:16](242,247)h1: </h1>',
			/* 24 */ '[11:16]>[12:1](247,248)#text: ⏎',
			/* 25 */ '[12:1]>[12:8](248,255)body: </body>',
			/* 26 */ '[12:8]>[13:1](255,256)#text: ⏎',
			/* 27 */ '[13:1]>[13:8](256,263)html: </html>',
			/* 28 */ '[13:8]>[14:1](263,264)#text: ⏎',
		]);
		// console.log(map);
		// console.log(doc.nodeList.map((n, i) => `${i}: ${n.uuid} ${n.raw.trim()}`));

		// #text ⏎
		expect(doc.nodeList[0]?.parentNode).toEqual(null);

		// Doctype <!DOCTYPE␣html>
		expect(doc.nodeList[1]?.parentNode).toEqual(null);

		// #text ⏎
		expect(doc.nodeList[2]?.parentNode).toEqual(null);

		// html <html␣lang="en">
		expect(doc.nodeList[3]?.parentNode).toEqual(null);
		{
			const node: MLASTElement = doc.nodeList[3] as MLASTElement;
			expect(node.childNodes[0]?.uuid).toEqual(doc.nodeList[4]?.uuid);
			expect(node.childNodes[1]?.uuid).toEqual(doc.nodeList[5]?.uuid);
			expect(node.childNodes[3]?.uuid).toEqual(doc.nodeList[18]?.uuid);
			expect(node.childNodes[4]?.uuid).toEqual(doc.nodeList[19]?.uuid);
			expect(node.childNodes[6]?.uuid).toEqual(doc.nodeList[26]?.uuid);
		}

		// #text ⏎
		expect(doc.nodeList[4]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		// head <head>
		expect(doc.nodeList[5]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		{
			const node: MLASTElement = doc.nodeList[5] as MLASTElement;
			expect(node.childNodes[0]?.uuid).toEqual(doc.nodeList[6]?.uuid);
			expect(node.childNodes[1]?.uuid).toEqual(doc.nodeList[7]?.uuid);
			expect(node.childNodes[2]?.uuid).toEqual(doc.nodeList[8]?.uuid);
			expect(node.childNodes[3]?.uuid).toEqual(doc.nodeList[9]?.uuid);
			expect(node.childNodes[4]?.uuid).toEqual(doc.nodeList[10]?.uuid);
			expect(node.childNodes[5]?.uuid).toEqual(doc.nodeList[11]?.uuid);
			expect(node.childNodes[6]?.uuid).toEqual(doc.nodeList[12]?.uuid);
			expect(node.childNodes[7]?.uuid).toEqual(doc.nodeList[13]?.uuid);
			expect(node.childNodes[8]?.uuid).toEqual(doc.nodeList[15]?.uuid);
			expect(node.childNodes[9]?.uuid).toEqual(doc.nodeList[16]?.uuid);
		}

		// #text ⏎→
		expect(doc.nodeList[6]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// meta <meta␣charset="UTF-8">
		expect(doc.nodeList[7]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// #text ⏎→
		expect(doc.nodeList[8]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// meta <meta␣name="viewport"␣content="width=device-width,␣initial-scale=1.0">
		expect(doc.nodeList[9]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// #text ⏎→
		expect(doc.nodeList[10]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// meta <meta␣http-equiv="X-UA-Compatible"␣content="ie=edge">
		expect(doc.nodeList[11]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// #text ⏎→
		expect(doc.nodeList[12]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// meta <title>
		expect(doc.nodeList[13]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);
		{
			const node: MLASTElement = doc.nodeList[13] as MLASTElement;
			expect(node.childNodes[0]?.uuid).toEqual(doc.nodeList[14]?.uuid);
		}

		// #text Document
		expect(doc.nodeList[14]?.parentNode?.uuid).toEqual(doc.nodeList[13]?.uuid);

		// meta </title>
		expect(doc.nodeList[15]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// #text ⏎
		expect(doc.nodeList[16]?.parentNode?.uuid).toEqual(doc.nodeList[5]?.uuid);

		// meta </head>
		expect(doc.nodeList[17]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		// #text ⏎
		expect(doc.nodeList[18]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		// head <body>
		expect(doc.nodeList[19]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);
		{
			const node: MLASTElement = doc.nodeList[19] as MLASTElement;
			expect(node.childNodes[0]?.uuid).toEqual(doc.nodeList[20]?.uuid);
			expect(node.childNodes[1]?.uuid).toEqual(doc.nodeList[21]?.uuid);
			expect(node.childNodes[2]?.uuid).toEqual(doc.nodeList[23]?.uuid);
		}

		// #text ⏎→
		expect(doc.nodeList[20]?.parentNode?.uuid).toEqual(doc.nodeList[19]?.uuid);

		// head <h1>
		expect(doc.nodeList[21]?.parentNode?.uuid).toEqual(doc.nodeList[19]?.uuid);
		{
			const node: MLASTElement = doc.nodeList[21] as MLASTElement;
			expect(node.childNodes[0]?.uuid).toEqual(doc.nodeList[22]?.uuid);
		}

		// #text Title
		expect(doc.nodeList[22]?.parentNode?.uuid).toEqual(doc.nodeList[21]?.uuid);

		// head </h1>
		expect(doc.nodeList[23]?.parentNode?.uuid).toEqual(doc.nodeList[19]?.uuid);

		// #text ⏎
		expect(doc.nodeList[24]?.parentNode?.uuid).toEqual(doc.nodeList[19]?.uuid);

		// </body>
		expect(doc.nodeList[25]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		// #text ⏎
		expect(doc.nodeList[26]?.parentNode?.uuid).toEqual(doc.nodeList[3]?.uuid);

		// </html>
		expect(doc.nodeList[27]?.parentNode).toEqual(null);

		// #text ⏎
		expect(doc.nodeList[28]?.parentNode).toEqual(null);
	});

	test('Offset', () => {
		const doc = parse(
			`<span>
			<img src="path/to">
		</span>
			`,
			{
				offsetOffset: 15,
				offsetLine: 2,
				offsetColumn: 2,
			},
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:2]>[2:8](15,21)span: <span>',
			'[2:8]>[3:4](21,25)#text: ⏎→→→',
			'[3:4]>[3:23](25,44)img: <img␣src="path/to">',
			'[3:23]>[4:3](44,47)#text: ⏎→→',
			'[4:3]>[4:10](47,54)span: </span>',
			'[4:10]>[5:4](54,58)#text: ⏎→→→',
		]);

		const node: MLASTElement = doc.nodeList[2] as MLASTElement;
		expect(node.attributes[0]?.startOffset).toBe(30);
		expect(node.attributes[0]?.endOffset).toBe(43);
		expect(node.attributes[0]?.startLine).toBe(3);
		expect(node.attributes[0]?.endLine).toBe(3);
		expect(node.attributes[0]?.startCol).toBe(9);
		expect(node.attributes[0]?.endCol).toBe(22);
	});

	test('Offset 2', () => {
		const doc = parse(
			`  <span>
			<img src="path/to">
		</span>
			`,
			{
				offsetOffset: 15,
				offsetLine: 2,
				offsetColumn: 2,
			},
		);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[2:2]>[2:4](15,17)#text: ␣␣',
			'[2:4]>[2:10](17,23)span: <span>',
			'[2:10]>[3:4](23,27)#text: ⏎→→→',
			'[3:4]>[3:23](27,46)img: <img␣src="path/to">',
			'[3:23]>[4:3](46,49)#text: ⏎→→',
			'[4:3]>[4:10](49,56)span: </span>',
			'[4:10]>[5:4](56,60)#text: ⏎→→→',
		]);
	});

	test('The fragment tree', () => {
		const doc = parse('<audio><source media="print"></audio>');
		// const map = nodeListToDebugMaps(doc.nodeList);
		// console.log(map);

		expect(doc.nodeList[0]?.parentNode).toEqual(null);
		expect(doc.nodeList[1]?.parentNode?.parentNode).toEqual(null);
	});

	test('code in script', () => {
		const doc = parse("<script>const $span = '<span>text</span>';</script>");
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(doc.unknownParseError).toBeUndefined();
		expect(map).toStrictEqual([
			//
			'[1:1]>[1:9](0,8)script: <script>',
			'[1:43]>[1:52](42,51)script: </script>',
		]);
	});

	test('With frontmatter', () => {
		const doc = parse('---\np: v\n---\n<html></html>', { ignoreFrontMatter: true });
		expect(doc.nodeList[0]?.nodeName).toBe('#ps:front-matter');
		expect(doc.nodeList[1]?.nodeName).toBe('html');

		const doc2 = parse('---\np: v\n---\n<html></html>', { ignoreFrontMatter: false });
		const ghostNode = doc2.nodeList[0] as MLASTElement;
		expect(ghostNode.nodeName).toBe('html');
		expect(ghostNode.isGhost).toBe(true);

		const doc3 = parse('---\np: v\n---\n<div></div>', { ignoreFrontMatter: true });
		expect(doc3.nodeList[0]?.nodeName).toBe('#ps:front-matter');
		expect(doc3.nodeList[1]?.nodeName).toBe('div');

		const doc4 = parse('---\np: v\n---\n<div></div>', { ignoreFrontMatter: false });
		expect(doc4.nodeList[0]?.nodeName).toBe('#text');
		expect(doc4.nodeList[1]?.nodeName).toBe('div');
	});

	test('Static attribute', () => {
		const ast = parse('<a href=""/>');
		const node: MLASTElement = ast.nodeList[0] as MLASTElement;
		const attrMaps = attributesToDebugMaps(node.attributes);
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
			],
		]);
	});

	test('svg', () => {
		const doc = parse(`<div>
	<svg>
		<a></a>
		<switch>
			<g>
				<rect />
			</g>
			<foreignObject>
				<div></div>
			</foreignObject>
		</switch>
	</svg>
</div>
`);
		const map = nodeListToDebugMaps(doc.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[2:2](5,7)#text: ⏎→',
			'[2:2]>[2:7](7,12)svg: <svg>',
			'[2:7]>[3:3](12,15)#text: ⏎→→',
			'[3:3]>[3:6](15,18)a: <a>',
			'[3:6]>[3:10](18,22)a: </a>',
			'[3:10]>[4:3](22,25)#text: ⏎→→',
			'[4:3]>[4:11](25,33)switch: <switch>',
			'[4:11]>[5:4](33,37)#text: ⏎→→→',
			'[5:4]>[5:7](37,40)g: <g>',
			'[5:7]>[6:5](40,45)#text: ⏎→→→→',
			'[6:5]>[6:13](45,53)rect: <rect␣/>',
			'[6:13]>[7:4](53,57)#text: ⏎→→→',
			'[7:4]>[7:8](57,61)g: </g>',
			'[7:8]>[8:4](61,65)#text: ⏎→→→',
			'[8:4]>[8:19](65,80)foreignObject: <foreignObject>',
			'[8:19]>[9:5](80,85)#text: ⏎→→→→',
			'[9:5]>[9:10](85,90)div: <div>',
			'[9:10]>[9:16](90,96)div: </div>',
			'[9:16]>[10:4](96,100)#text: ⏎→→→',
			'[10:4]>[10:20](100,116)foreignObject: </foreignObject>',
			'[10:20]>[11:3](116,119)#text: ⏎→→',
			'[11:3]>[11:12](119,128)switch: </switch>',
			'[11:12]>[12:2](128,130)#text: ⏎→',
			'[12:2]>[12:8](130,136)svg: </svg>',
			'[12:8]>[13:1](136,137)#text: ⏎',
			'[13:1]>[13:7](137,143)div: </div>',
			'[13:7]>[14:1](143,144)#text: ⏎',
		]);
	});

	describe('CRLF', () => {
		test('Standard', () => {
			const doc = parse('<!doctype html>\r\n<html\r\n><head\r\n>\r\n</head\r\n><body\r\n>');
			const map = nodeListToDebugMaps(doc.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[1:16](0,15)#doctype: <!doctype␣html>',
				'[1:16]>[2:1](15,17)#text: ␣⏎',
				'[2:1]>[3:2](17,25)html: <html␣⏎>',
				'[3:2]>[4:2](25,33)head: <head␣⏎>',
				'[4:2]>[5:1](33,35)#text: ␣⏎',
				'[5:1]>[6:2](35,44)head: </head␣⏎>',
				'[6:2]>[7:2](44,52)body: <body␣⏎>',
			]);
		});

		test('Fragment', () => {
			const doc = parse('<div\r\na\r\n=\r\n"ab\r\nc"\r\n>\r\ntext\r\n</div\r\n>');
			const map = nodeListToDebugMaps(doc.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[6:2](0,22)div: <div␣⏎a␣⏎=␣⏎"ab␣⏎c"␣⏎>',
				'[2:1]>[5:3](6,19)a: a␣⏎=␣⏎"ab␣⏎c"',
				'  [1:5]>[2:1](4,6)bN: ␣⏎',
				'  [2:1]>[2:2](6,7)name: a',
				'  [2:2]>[3:1](7,9)bE: ␣⏎',
				'  [3:1]>[3:2](9,10)equal: =',
				'  [3:2]>[4:1](10,12)aE: ␣⏎',
				'  [4:1]>[4:2](12,13)sQ: "',
				'  [4:2]>[5:2](13,18)value: ab␣⏎c',
				'  [5:2]>[5:3](18,19)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
				'[6:2]>[8:1](22,30)#text: ␣⏎text␣⏎',
				'[8:1]>[9:2](30,38)div: </div␣⏎>',
			]);
		});
	});
});

describe('Issues', () => {
	test('#775', () => {
		expect(nodeListToDebugMaps(parse('<pre>text</pre>').nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)pre: <pre>',
			'[1:6]>[1:10](5,9)#text: text',
			'[1:10]>[1:16](9,15)pre: </pre>',
		]);

		const nodes = parse('<pre>\ntext</pre>').nodeList;

		expect(nodeListToDebugMaps(nodes)).toStrictEqual([
			'[1:1]>[1:6](0,5)pre: <pre>',
			'[1:6]>[2:5](5,10)#text: ⏎text',
			'[2:5]>[2:11](10,16)pre: </pre>',
		]);

		const node: MLASTElement = nodes[0] as MLASTElement;
		expect(node.childNodes?.[0]?.raw).toBe('\ntext');

		/**
		 * Test for `<textarea>`
		 *
		 * @see https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
		 */
		const nodes2 = parse('<textarea>\ntext</textarea>').nodeList;
		expect(nodeListToDebugMaps(nodes2)).toStrictEqual([
			'[1:1]>[1:11](0,10)textarea: <textarea>',
			'[1:11]>[2:5](10,15)#text: ⏎text',
			'[2:5]>[2:16](15,26)textarea: </textarea>',
		]);
		const node2: MLASTElement = nodes2[0] as MLASTElement;
		expect(node2.childNodes?.[0]?.raw).toBe('\ntext');
	});

	test('#1042', () => {
		const doc = parse('---\nkey: value\n---\n\n\n<!doctype html>\n<html\n><head\n>\n</head\n><body\n>', {
			ignoreFrontMatter: true,
		});
		const map = nodeListToDebugMaps(doc.nodeList, true);
		expect(map).toStrictEqual([
			'[1:1]>[6:1](0,21)#ps:front-matter: ---⏎key:␣value⏎---⏎⏎⏎',
			'[6:1]>[6:16](21,36)#doctype: <!doctype␣html>',
			'[6:16]>[7:1](36,37)#text: ⏎',
			'[7:1]>[8:2](37,44)html: <html⏎>',
			'[8:2]>[9:2](44,51)head: <head⏎>',
			'[9:2]>[10:1](51,52)#text: ⏎',
			'[10:1]>[11:2](52,60)head: </head⏎>',
			'[11:2]>[12:2](60,67)body: <body⏎>',
		]);
	});
});
