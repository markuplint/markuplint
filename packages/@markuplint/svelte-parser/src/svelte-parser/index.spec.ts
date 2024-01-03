import { describe, test, expect } from 'vitest';

import { svelteParse } from './index.js';

describe('parser', () => {
	test('if', () => {
		expect(svelteParse('{#if cond}text{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 19,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text', end: 14, raw: 'text', start: 10, type: 'Text' }],
			},
		]);
	});

	test('if else', () => {
		expect(svelteParse('{#if cond}text1{:else}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 32,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text1', end: 15, raw: 'text1', start: 10, type: 'Text' }],
				else: {
					children: [{ data: 'text2', end: 27, raw: 'text2', start: 22, type: 'Text' }],
					end: 27,
					start: 22,
					type: 'ElseBlock',
				},
			},
		]);
	});

	test('if else if', () => {
		expect(svelteParse('{#if cond}text1{:else if cond}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 40,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text1', end: 15, raw: 'text1', start: 10, type: 'Text' }],
				else: {
					type: 'ElseBlock',
					start: 30,
					end: 35,
					children: [
						{
							type: 'IfBlock',
							start: 30,
							end: 40,
							elseif: true,
							children: [{ data: 'text2', end: 35, raw: 'text2', start: 30, type: 'Text' }],
							expression: {
								end: 29,
								loc: { end: { column: 29, line: 1 }, start: { column: 25, line: 1 } },
								name: 'cond',
								start: 25,
								type: 'Identifier',
							},
						},
					],
				},
			},
		]);
	});

	test('white spaces with if', () => {
		expect(svelteParse('text1  {#if cond}  text2  {/if}  ')).toEqual([
			{
				data: 'text1  ',
				end: 7,
				raw: 'text1  ',
				start: 0,
				type: 'Text',
			},
			{
				type: 'IfBlock',
				start: 7,
				end: 31,
				expression: {
					end: 16,
					loc: { end: { column: 16, line: 1 }, start: { column: 12, line: 1 } },
					name: 'cond',
					start: 12,
					type: 'Identifier',
				},
				children: [{ data: 'text2', end: 26, raw: '  text2  ', start: 17, type: 'Text' }],
			},
		]);
	});
});

describe('Issues', () => {
	test('#991', () => {
		expect(svelteParse("<CustomElement><div>Evaluation doesn't work</div></CustomElement>")).toEqual([
			{
				type: 'InlineComponent',
				name: 'CustomElement',
				start: 0,
				end: 65,
				attributes: [],
				children: [
					{
						type: 'Element',
						name: 'div',
						start: 15,
						end: 49,
						attributes: [],
						children: [
							{
								type: 'Text',
								start: 20,
								end: 43,
								data: "Evaluation doesn't work",
								raw: "Evaluation doesn't work",
							},
						],
					},
				],
			},
		]);
	});

	test('#1286', () => {
		const ast = svelteParse('{#each list as item, i (`${i}-${i}`)}{/each}');
		expect(ast).toEqual([
			{
				children: [],
				context: {
					end: 19,
					name: 'item',
					start: 15,
					type: 'Identifier',
				},
				end: 44,
				expression: {
					end: 11,
					loc: {
						end: {
							column: 11,
							line: 1,
						},
						start: {
							column: 7,
							line: 1,
						},
					},
					name: 'list',
					start: 7,
					type: 'Identifier',
				},
				index: 'i',
				key: {
					end: 35,
					expressions: [
						{
							end: 28,
							loc: {
								end: {
									column: 28,
									line: 1,
								},
								start: {
									column: 27,
									line: 1,
								},
							},
							name: 'i',
							start: 27,
							type: 'Identifier',
						},
						{
							end: 33,
							loc: {
								end: {
									column: 33,
									line: 1,
								},
								start: {
									column: 32,
									line: 1,
								},
							},
							name: 'i',
							start: 32,
							type: 'Identifier',
						},
					],
					loc: {
						end: {
							column: 35,
							line: 1,
						},
						start: {
							column: 24,
							line: 1,
						},
					},
					quasis: [
						{
							end: 25,
							loc: {
								end: {
									column: 25,
									line: 1,
								},
								start: {
									column: 25,
									line: 1,
								},
							},
							start: 25,
							tail: false,
							type: 'TemplateElement',
							value: {
								cooked: '',
								raw: '',
							},
						},
						{
							end: 30,
							loc: {
								end: {
									column: 30,
									line: 1,
								},
								start: {
									column: 29,
									line: 1,
								},
							},
							start: 29,
							tail: false,
							type: 'TemplateElement',
							value: {
								cooked: '-',
								raw: '-',
							},
						},
						{
							end: 34,
							loc: {
								end: {
									column: 34,
									line: 1,
								},
								start: {
									column: 34,
									line: 1,
								},
							},
							start: 34,
							tail: true,
							type: 'TemplateElement',
							value: {
								cooked: '',
								raw: '',
							},
						},
					],
					start: 24,
					type: 'TemplateLiteral',
				},
				start: 0,
				type: 'EachBlock',
			},
		]);
	});

	expect(() => svelteParse('{#each list as item, i `${i}-${i}`)}{/each}')).toThrowError();
});
