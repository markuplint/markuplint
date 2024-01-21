import { describe, test, expect } from 'vitest';

import { ignoreBlock } from './ignore-block.js';

const tags = [
	{
		type: 'ejs-tag',
		start: /<%/,
		end: /%>/,
	},
];

describe('ignoreBlock', () => {
	test('basic', () => {
		const result = ignoreBlock('<div><%= test %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test %></div>',
			replaced: '<div><!></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test ',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('2 tags', () => {
		const result = ignoreBlock('<div><%= test %></div><div><%= test2 %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test %></div><div><%= test2 %></div>',
			replaced: '<div><!></div><div><!></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test ',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-tag',
					index: 27,
					startTag: '<%',
					taggedCode: '= test2 ',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('without closing tag', () => {
		const result = ignoreBlock('<div><%= test', tags);
		expect(result).toStrictEqual({
			source: '<div><%= test',
			replaced: '<div><!>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '= test',
					endTag: null,
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('with line break', () => {
		const result = ignoreBlock('<div><% if () {\n\t\n} %></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><% if () {\n\t\n} %></div>',
			replaced: '<div><!\n\n></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: ' if () {\n\t\n} ',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('CRLF', () => {
		const result = ignoreBlock('<div><%\r\nif () {\r\n}\r\n%></div>', tags);
		expect(result).toStrictEqual({
			source: '<div><%\r\nif () {\r\n}\r\n%></div>',
			replaced: '<div><!\n\n\n></div>',
			stack: [
				{
					type: 'ejs-tag',
					index: 5,
					startTag: '<%',
					taggedCode: '\r\nif () {\r\n}\r\n',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});

	test('multiple tags', () => {
		const result = ignoreBlock('<% 1 %>2<%= 3 %>4<%_ 5 _%>6<%- 7 -%>8<%% 9 %>', [
			{
				type: 'ejs-whitespace-slurping',
				start: /<%_/,
				end: /%>/,
			},
			{
				type: 'ejs-output-value',
				start: /<%=/,
				end: /%>/,
			},
			{
				type: 'ejs-output-unescaped',
				start: /<%-/,
				end: /%>/,
			},
			{
				type: 'ejs-comment',
				start: /<%#/,
				end: /%>/,
			},
			{
				type: 'ejs-scriptlet',
				start: /<%(?!%)/,
				end: /%>/,
			},
		]);

		expect(result).toStrictEqual({
			source: '<% 1 %>2<%= 3 %>4<%_ 5 _%>6<%- 7 -%>8<%% 9 %>',
			replaced: '<!>2<!>4<!>6<!>8<%% 9 %>',
			stack: [
				{
					type: 'ejs-scriptlet',
					index: 0,
					startTag: '<%',
					taggedCode: ' 1 ',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-output-value',
					index: 8,
					startTag: '<%=',
					taggedCode: ' 3 ',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-whitespace-slurping',
					index: 17,
					startTag: '<%_',
					taggedCode: ' 5 _',
					endTag: '%>',
					resolved: false,
				},
				{
					type: 'ejs-output-unescaped',
					index: 27,
					startTag: '<%-',
					taggedCode: ' 7 -',
					endTag: '%>',
					resolved: false,
				},
			],
			maskChar: '',
		});
	});
});
