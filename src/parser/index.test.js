import test from 'ava';
import parser from '../../lib/parser';

test((t) => {
	const d = parser('<!DOCTYPE html>');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list.length, 4);
});

test((t) => {
	const d = parser('<!DOCTYPE html> ');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, '#eof');
	t.is(d.list.length, 5);
});

test((t) => {
	const d = parser('<!DOCTYPE html>\n');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, '#eof');
	t.is(d.list[4].raw, '\n');
	t.is(d.list.length, 5);
});

test((t) => {
	const d = parser('<!DOCTYPE html>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].col, 16);
	t.is(d.list.length, 5);
});

test((t) => {
	const d = parser('<!DOCTYPE html> text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, ' ');
	t.is(d.list[4].col, 16);
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, 'text');
	t.is(d.list[5].col, 17);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html> text');
});

test((t) => {
	const d = parser('<!DOCTYPE html>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, '\n');
	t.is(d.list[4].col, 16);
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, 'text');
	t.is(d.list[5].col, 1);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html>\ntext');
});

test((t) => {
	const d = parser('<!DOCTYPE html>\n<p>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, '#ws');
	t.is(d.list[5].nodeName, 'p');
	t.is(d.list[6].type, 'Text');
	t.is(d.list[6].raw, 'text');
	t.is(d.list[6].col, 4);
	t.is(d.list.length, 7);
	t.is(d.toString(), '<!DOCTYPE html>\n<p>text');
});

test((t) => {
	const d = parser('<!DOCTYPE html><p>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].nodeName, 'p');
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, '\ntext');
	t.is(d.list[5].col, 19);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html><p>\ntext');
});

test((t) => {
	const d = parser('<!DOCTYPE html>\n<html>text');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, '#ws');
	t.is(d.list[2].nodeName, 'html');
	t.is(d.list[3].nodeName, 'head');
	t.is(d.list[4].nodeName, 'body');
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, 'text');
	t.is(d.list[5].col, 7);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html>\n<html>text');
});

test((t) => {
	const d = parser('<!DOCTYPE html><html>\ntext');
	t.is(d.list[0].type, 'Doctype');
	t.is(d.list[1].nodeName, 'html');
	t.is(d.list[2].nodeName, 'head');
	t.is(d.list[3].nodeName, 'body');
	t.is(d.list[4].type, 'Text');
	t.is(d.list[4].raw, '\n');
	t.is(d.list[4].col, 22);
	t.is(d.list[5].type, 'Text');
	t.is(d.list[5].raw, 'text');
	t.is(d.list[5].col, 1);
	t.is(d.list.length, 6);
	t.is(d.toString(), '<!DOCTYPE html><html>\ntext');
});

test((t) => {
	const d = parser('');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list.length, 3);
	t.is(d.toString(), '');
});

test((t) => {
	const d = parser('<html>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list.length, 3);
	t.is(d.toString(), '<html>');
});

test((t) => {
	const d = parser('<html></body>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list[3].nodeName, '#eof');
	t.is(d.list[3].raw, '</body>');
	t.is(d.list.length, 4);
	t.is(d.toString(), '<html></body>');
});

test((t) => {
	const d = parser('text');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list[3].nodeName, '#text');
	t.is(d.toString(), 'text');
});

test((t) => {
	const d = parser('<html>invalid-before-text<body>text</body>invalid-after-text</html>');
	t.is(d.list[0].nodeName, 'html');
	t.is(d.list[1].nodeName, 'head');
	t.is(d.list[2].nodeName, 'body');
	t.is(d.list[3].nodeName, '#text');
	t.is(d.list[4].nodeName, 'html');
	t.is(d.list.length, 5);
	t.is(d.toString(), '<html>invalid-before-text<body>text</body>invalid-after-text</html>');
});

test((t) => {
	const d = parser(`
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
	text-node
	</body>
	</html>
	`);
	t.deepEqual(d.toDebugMap(), [
		'[1:1]>[2:1](0,2)#ws: ⏎→',
		'[2:2]>[2:17](2,17)#doctype: <!DOCTYPE␣html>',
		'[2:17]>[3:1](17,19)#ws: ⏎→',
		'[3:2]>[3:18](19,35)html: <html␣lang="en">',
		'[3:18]>[4:1](35,37)#ws: ⏎→',
		'[4:2]>[4:8](37,43)head: <head>',
		'[4:8]>[5:2](43,46)#text: ⏎→→',
		'[5:3]>[5:25](46,68)meta: <meta␣charset="UTF-8">',
		'[5:25]>[6:2](68,71)#text: ⏎→→',
		'[6:3]>[6:73](71,141)meta: <meta␣name="viewport"␣content="width=device-width,␣initial-scale=1.0">',
		'[6:73]>[7:2](141,144)#text: ⏎→→',
		'[7:3]>[7:56](144,197)meta: <meta␣http-equiv="X-UA-Compatible"␣content="ie=edge">',
		'[7:56]>[8:2](197,200)#text: ⏎→→',
		'[8:3]>[8:10](200,207)title: <title>',
		'[8:10]>[8:18](207,215)#text: Document',
		'[8:18]>[8:26](215,223)title: </title>',
		'[8:26]>[9:1](223,225)#text: ⏎→',
		'[9:2]>[9:9](225,232)head: </head>',
		'[9:9]>[10:1](232,234)#text: ⏎→',
		'[10:2]>[10:8](234,240)body: <body>',
		'[10:8]>[11:2](240,243)#text: ⏎→→',
		'[11:3]>[11:11](243,251)script: <script>',
		'[11:11]>[13:2](251,270)#text: ⏎→→→const␣i␣=␣0;⏎→→',
		'[13:3]>[13:12](270,279)script: </script>',
		'[13:12]>[14:2](279,282)#text: ⏎→→',
		'[14:3]>[14:18](282,297)#comment: <!comment-node>',
		'[14:18]>[15:2](297,300)#text: ⏎→→',
		'[15:3]>[15:24](300,321)#comment: <!--␣html-comment␣-->',
		'[15:24]>[16:2](321,324)#text: ⏎→→',
		'[16:3]>[16:8](324,329)div: <div>',
		'[16:8]>[18:2](329,348)#text: ⏎→→→text&amp;div⏎→→',
		'[18:3]>[18:9](348,354)div: </div>',
		'[18:9]>[22:1](354,367)#text: ⏎→text-node⏎→',
		'[20:2]>[20:9](367,374)body: </body>',
		'[20:9]>[21:1](374,376)#ws: ⏎→',
		'[21:2]>[21:9](376,383)html: </html>',
		'[21:9]>[22:1](383,385)#eof: ⏎→',
	]);
});

test('noop', (t) => t.pass());
