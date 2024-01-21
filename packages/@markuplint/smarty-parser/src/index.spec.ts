import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Node list', () => {
	test('a code', () => {
		const doc = parse('<div>abc{ efg }hij</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:16](8,15)#ps:smarty-scriptlet: {␣efg␣}',
			'[1:16]>[1:19](15,18)#text: hij',
			'[1:19]>[1:25](18,24)div: </div>',
		]);
	});

	test('two codes', () => {
		const doc = parse('<div>abc{ efg }hij{ kim }</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:16](8,15)#ps:smarty-scriptlet: {␣efg␣}',
			'[1:16]>[1:19](15,18)#text: hij',
			'[1:19]>[1:26](18,25)#ps:smarty-scriptlet: {␣kim␣}',
			'[1:26]>[1:32](25,31)div: </div>',
		]);
	});

	test('two codes2', () => {
		const doc = parse('<div>abc{ efg }hij{ klm }nop</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:16](8,15)#ps:smarty-scriptlet: {␣efg␣}',
			'[1:16]>[1:19](15,18)#text: hij',
			'[1:19]>[1:26](18,25)#ps:smarty-scriptlet: {␣klm␣}',
			'[1:26]>[1:29](25,28)#text: nop',
			'[1:29]>[1:35](28,34)div: </div>',
		]);
	});

	test('two codes2 on bare', () => {
		const doc = parse('abc{ efg }hij{ klm }nop');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:4](0,3)#text: abc',
			'[1:4]>[1:11](3,10)#ps:smarty-scriptlet: {␣efg␣}',
			'[1:11]>[1:14](10,13)#text: hij',
			'[1:14]>[1:21](13,20)#ps:smarty-scriptlet: {␣klm␣}',
			'[1:21]>[1:24](20,23)#text: nop',
		]);
	});

	test('nest block', () => {
		const doc = parse('{if foo}abcdef{/if}');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:9](0,8)#ps:smarty-scriptlet: {if␣foo}',
			'[1:9]>[1:15](8,14)#text: abcdef',
			'[1:15]>[1:20](14,19)#ps:smarty-scriptlet: {/if}',
		]);
	});

	test('nest block', () => {
		const doc = parse('{if foo}abc{ foo }def{/if}');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:9](0,8)#ps:smarty-scriptlet: {if␣foo}',
			'[1:9]>[1:12](8,11)#text: abc',
			'[1:12]>[1:19](11,18)#ps:smarty-scriptlet: {␣foo␣}',
			'[1:19]>[1:22](18,21)#text: def',
			'[1:22]>[1:27](21,26)#ps:smarty-scriptlet: {/if}',
		]);
	});

	test('nest block', () => {
		const doc = parse(`{if user}
<div>{ user.name }</div>
{/if}
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:10](0,9)#ps:smarty-scriptlet: {if␣user}',
			'[1:10]>[2:1](9,10)#text: ⏎',
			'[2:1]>[2:6](10,15)div: <div>',
			'[2:6]>[2:19](15,28)#ps:smarty-scriptlet: {␣user.name␣}',
			'[2:19]>[2:25](28,34)div: </div>',
			'[2:25]>[3:1](34,35)#text: ⏎',
			'[3:1]>[3:6](35,40)#ps:smarty-scriptlet: {/if}',
			'[3:6]>[4:1](40,41)#text: ⏎',
		]);

		const el = doc.nodeList[3];
		const el2 = doc.nodeList[3]?.parentNode?.childNodes?.[0];
		expect(el?.nodeName).toBe(el2?.nodeName);
		expect(el?.uuid).toBe(el2?.uuid);
	});

	test('Full HTML', () => {
		const doc = parse(`<!DOCTYPE html>
<html lang="en">
	<head>
		{include file='path/to'}
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
			"[4:3]>[4:27](43,67)#ps:smarty-scriptlet: {include␣file='path/to'}",
			'[4:27]>[5:3](67,70)#text: ⏎→→',
			'[5:3]>[5:11](70,78)meta: <meta␣/>',
			'[5:11]>[6:2](78,80)#text: ⏎→',
			'[6:2]>[6:9](80,87)head: </head>',
			'[6:9]>[7:2](87,89)#text: ⏎→',
			'[7:2]>[7:8](89,95)body: <body>',
			'[7:8]>[7:15](95,102)body: </body>',
			'[7:15]>[8:1](102,103)#text: ⏎',
			'[8:1]>[8:8](103,110)html: </html>',
			'[8:8]>[9:1](110,111)#text: ⏎',
		]);
	});

	test('mutable text node', () => {
		const doc = parse('<title>{ title }</title>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:8](0,7)title: <title>',
			'[1:8]>[1:17](7,16)#ps:smarty-scriptlet: {␣title␣}',
			'[1:17]>[1:25](16,24)title: </title>',
		]);
	});
});

describe('Tags', () => {
	test('smarty-comment', () => {
		expect(parse('{* any *}').nodeList[0]?.nodeName).toBe('#ps:smarty-comment');
	});

	test('smarty-scriptlet', () => {
		expect(parse('{ any }').nodeList[0]?.nodeName).toBe('#ps:smarty-scriptlet');
	});
});

describe('Issues', () => {
	test('#470', () => {
		const ast = parse("<script>{literal}const obj = { foo: 'bar' };{/literal}</script>");
		expect(nodeListToDebugMaps(ast.nodeList)).toStrictEqual([
			'[1:1]>[1:9](0,8)script: <script>',
			'[1:55]>[1:64](54,63)script: </script>',
		]);
	});
});
