import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Node list', () => {
	test('a code', () => {
		const doc = parse('<div>abc{{ efg }}hij</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:18](8,17)#ps:mustache-tag: {{␣efg␣}}',
			'[1:18]>[1:21](17,20)#text: hij',
			'[1:21]>[1:27](20,26)div: </div>',
		]);
	});

	test('two codes', () => {
		const doc = parse('<div>abc{{ efg }}hij{{ klm }}</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:18](8,17)#ps:mustache-tag: {{␣efg␣}}',
			'[1:18]>[1:21](17,20)#text: hij',
			'[1:21]>[1:30](20,29)#ps:mustache-tag: {{␣klm␣}}',
			'[1:30]>[1:36](29,35)div: </div>',
		]);
	});

	test('two codes2', () => {
		const doc = parse('<div>abc{{ efg }}hij{{ klm }}nop</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:18](8,17)#ps:mustache-tag: {{␣efg␣}}',
			'[1:18]>[1:21](17,20)#text: hij',
			'[1:21]>[1:30](20,29)#ps:mustache-tag: {{␣klm␣}}',
			'[1:30]>[1:33](29,32)#text: nop',
			'[1:33]>[1:39](32,38)div: </div>',
		]);
	});

	test('two codes2 on bare', () => {
		const doc = parse('abc{{ efg }}hij{{ klm }}nop');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:4](0,3)#text: abc',
			'[1:4]>[1:13](3,12)#ps:mustache-tag: {{␣efg␣}}',
			'[1:13]>[1:16](12,15)#text: hij',
			'[1:16]>[1:25](15,24)#ps:mustache-tag: {{␣klm␣}}',
			'[1:25]>[1:28](24,27)#text: nop',
		]);
	});

	test('nest block', () => {
		const doc = parse('{{#nest}}abcdef{{/nest}}');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:10](0,9)#ps:mustache-tag: {{#nest}}',
			'[1:10]>[1:16](9,15)#text: abcdef',
			'[1:16]>[1:25](15,24)#ps:mustache-tag: {{/nest}}',
		]);
	});

	test('nest block', () => {
		const doc = parse('{{#user}}<div>{{ user.name }}</div>{{/user}}');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:10](0,9)#ps:mustache-tag: {{#user}}',
			'[1:10]>[1:15](9,14)div: <div>',
			'[1:15]>[1:30](14,29)#ps:mustache-tag: {{␣user.name␣}}',
			'[1:30]>[1:36](29,35)div: </div>',
			'[1:36]>[1:45](35,44)#ps:mustache-tag: {{/user}}',
		]);

		const el = doc.nodeList[2];
		const el2 = doc.nodeList[2]?.parentNode?.childNodes?.[0];
		expect(el?.nodeName).toBe(el2?.nodeName);
		expect(el?.uuid).toBe(el2?.uuid);
	});
});

describe('Tags', () => {
	test('mustache-tag', () => {
		expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-tag');
	});

	test('mustache-unescaped', () => {
		expect(parse('{{{ any }}}').nodeList[0]?.nodeName).toBe('#ps:mustache-unescaped');
	});

	test('mustache-comment', () => {
		expect(parse('{{! any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-comment');
	});
});
