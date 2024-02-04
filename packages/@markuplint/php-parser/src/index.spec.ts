import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Node list', () => {
	test('a code', () => {
		const doc = parse('<div>abc<?= efg ?>hij</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:php-echo: <?=␣efg␣?>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:28](21,27)div: </div>',
		]);
	});

	test('two codes', () => {
		const doc = parse('<div>abc<?= efg ?>hij<?= klm ?></div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:php-echo: <?=␣efg␣?>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:php-echo: <?=␣klm␣?>',
			'[1:32]>[1:38](31,37)div: </div>',
		]);
	});

	test('two codes2', () => {
		const doc = parse('<div>abc<?= efg ?>hij<?= klm ?>nop</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:php-echo: <?=␣efg␣?>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:php-echo: <?=␣klm␣?>',
			'[1:32]>[1:35](31,34)#text: nop',
			'[1:35]>[1:41](34,40)div: </div>',
		]);
	});

	test('two codes2 on bare', () => {
		const doc = parse('abc<?= efg ?>hij<?= klm ?>nop');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:4](0,3)#text: abc',
			'[1:4]>[1:14](3,13)#ps:php-echo: <?=␣efg␣?>',
			'[1:14]>[1:17](13,16)#text: hij',
			'[1:17]>[1:27](16,26)#ps:php-echo: <?=␣klm␣?>',
			'[1:27]>[1:30](26,29)#text: nop',
		]);
	});

	test('nest block', () => {
		const doc = parse('<? if (foo) { ?>abcdef<? } ?>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:17](0,16)#ps:php-short-tag: <?␣if␣(foo)␣{␣?>',
			'[1:17]>[1:23](16,22)#text: abcdef',
			'[1:23]>[1:30](22,29)#ps:php-short-tag: <?␣}␣?>',
		]);
	});

	test('nest block', () => {
		const doc = parse('<? if (foo) { ?>abc<?= foo ?>def<? } ?>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:17](0,16)#ps:php-short-tag: <?␣if␣(foo)␣{␣?>',
			'[1:17]>[1:20](16,19)#text: abc',
			'[1:20]>[1:30](19,29)#ps:php-echo: <?=␣foo␣?>',
			'[1:30]>[1:33](29,32)#text: def',
			'[1:33]>[1:40](32,39)#ps:php-short-tag: <?␣}␣?>',
		]);
	});

	test('nest block', () => {
		const doc = parse(`<? if (user) { ?>
<div><?= user.name ?></div>
<? } ?>
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:18](0,17)#ps:php-short-tag: <?␣if␣(user)␣{␣?>',
			'[1:18]>[2:1](17,18)#text: ⏎',
			'[2:1]>[2:6](18,23)div: <div>',
			'[2:6]>[2:22](23,39)#ps:php-echo: <?=␣user.name␣?>',
			'[2:22]>[2:28](39,45)div: </div>',
			'[2:28]>[3:1](45,46)#text: ⏎',
			'[3:1]>[3:8](46,53)#ps:php-short-tag: <?␣}␣?>',
			'[3:8]>[4:1](53,54)#text: ⏎',
		]);

		const el = doc.nodeList[3];
		const el2 = doc.nodeList[3]?.parentNode?.childNodes?.[0];
		expect(el?.nodeName).toBe(el2?.nodeName);
		expect(el?.uuid).toBe(el2?.uuid);
	});

	test('omitted close tag', () => {
		const doc = parse('<div></div><?php include("path/to")');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:12](5,11)div: </div>',
			'[1:12]>[1:36](11,35)#ps:php-tag: <?php␣include("path/to")',
		]);
	});
});

describe('Tags', () => {
	test('php-tag', () => {
		expect(parse('<?php any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-tag');
		expect(parse('<?php any;').nodeList[0]?.nodeName).toBe('#ps:php-tag');
	});

	test('php-echo', () => {
		expect(parse('<?= any ?>').nodeList[0]?.nodeName).toBe('#ps:php-echo');
	});

	test('php-short-tag', () => {
		expect(parse('<? any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
		expect(parse('<? any;').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
	});
});
