// @ts-nocheck

import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Node list', () => {
	test('a code', () => {
		const doc = parse('<div>abc<%= efg %>hij</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:erb-ruby-expression: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:28](21,27)div: </div>',
		]);
	});

	test('two codes', () => {
		const doc = parse('<div>abc<%= efg %>hij<%= klm %></div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:erb-ruby-expression: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:erb-ruby-expression: <%=␣klm␣%>',
			'[1:32]>[1:38](31,37)div: </div>',
		]);
	});

	test('two codes2', () => {
		const doc = parse('<div>abc<%= efg %>hij<%= klm %>nop</div>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:9](5,8)#text: abc',
			'[1:9]>[1:19](8,18)#ps:erb-ruby-expression: <%=␣efg␣%>',
			'[1:19]>[1:22](18,21)#text: hij',
			'[1:22]>[1:32](21,31)#ps:erb-ruby-expression: <%=␣klm␣%>',
			'[1:32]>[1:35](31,34)#text: nop',
			'[1:35]>[1:41](34,40)div: </div>',
		]);
	});

	test('two codes2 on bare', () => {
		const doc = parse('abc<%= efg %>hij<%= klm %>nop');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:4](0,3)#text: abc',
			'[1:4]>[1:14](3,13)#ps:erb-ruby-expression: <%=␣efg␣%>',
			'[1:14]>[1:17](13,16)#text: hij',
			'[1:17]>[1:27](16,26)#ps:erb-ruby-expression: <%=␣klm␣%>',
			'[1:27]>[1:30](26,29)#text: nop',
		]);
	});

	test('nest block', () => {
		const doc = parse('<% if foo then %>abcdef<% end %>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:18](0,17)#ps:erb-ruby-code: <%␣if␣foo␣then␣%>',
			'[1:18]>[1:24](17,23)#text: abcdef',
			'[1:24]>[1:33](23,32)#ps:erb-ruby-code: <%␣end␣%>',
		]);
	});

	test('nest block', () => {
		const doc = parse('<% if foo then %>abc<%= foo %>def<% end %>');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:18](0,17)#ps:erb-ruby-code: <%␣if␣foo␣then␣%>',
			'[1:18]>[1:21](17,20)#text: abc',
			'[1:21]>[1:31](20,30)#ps:erb-ruby-expression: <%=␣foo␣%>',
			'[1:31]>[1:34](30,33)#text: def',
			'[1:34]>[1:43](33,42)#ps:erb-ruby-code: <%␣end␣%>',
		]);
	});

	test('nest block', () => {
		const doc = parse(`<% if user then %>
<div><%= user.name %></div>
<% end %>
`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:1]>[1:19](0,18)#ps:erb-ruby-code: <%␣if␣user␣then␣%>',
			'[1:19]>[2:1](18,19)#text: ⏎',
			'[2:1]>[2:6](19,24)div: <div>',
			'[2:6]>[2:22](24,40)#ps:erb-ruby-expression: <%=␣user.name␣%>',
			'[2:22]>[2:28](40,46)div: </div>',
			'[2:28]>[3:1](46,47)#text: ⏎',
			'[3:1]>[3:10](47,56)#ps:erb-ruby-code: <%␣end␣%>',
			'[3:10]>[4:1](56,57)#text: ⏎',
		]);

		const el = doc.nodeList[3];
		const el2 = doc.nodeList[3].parentNode.childNodes[0];
		expect(el.nodeName).toBe(el2.nodeName);
		expect(el.uuid).toBe(el2.uuid);
	});
});

describe('Tags', () => {
	test('erb-ruby-expression', () => {
		expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-expression');
	});

	test('erb-comment', () => {
		expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:erb-comment');
	});

	test('erb-ruby-code', () => {
		expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-code');
	});

	test('text node', () => {
		expect(parse('<%% any %>').nodeList[0].nodeName).toBe('#text');
	});
});
