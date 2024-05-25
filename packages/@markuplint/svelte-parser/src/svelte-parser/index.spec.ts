import { describe, test, expect } from 'vitest';

import { svelteParse } from './index.js';

describe('parser', () => {
	test('if', () => {
		expect(svelteParse('{#if cond}text{/if}')).toEqual([
			{
				type: 'IfBlock',
				elseif: false,
				start: 0,
				end: 19,
				test: {
					type: 'Identifier',
					name: 'cond',
					start: 5,
					end: 9,
					loc: {
						start: { line: 1, column: 5 },
						end: { line: 1, column: 9 },
					},
				},
				consequent: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'Text',
							data: 'text',
							raw: 'text',
							start: 10,
							end: 14,
						},
					],
				},
				alternate: null,
			},
		]);
	});

	test('if else', () => {
		expect(svelteParse('{#if cond}text1{:else}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				elseif: false,
				start: 0,
				end: 32,
				test: {
					type: 'Identifier',
					name: 'cond',
					start: 5,
					end: 9,
					loc: {
						start: { column: 5, line: 1 },
						end: { column: 9, line: 1 },
					},
				},
				consequent: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'Text',
							data: 'text1',
							raw: 'text1',
							start: 10,
							end: 15,
						},
					],
				},
				alternate: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'Text',
							start: 22,
							end: 27,
							data: 'text2',
							raw: 'text2',
						},
					],
				},
			},
		]);
	});

	test('if else if', () => {
		expect(svelteParse('{#if cond}text1{:else if cond}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				elseif: false,
				start: 0,
				end: 40,
				test: {
					type: 'Identifier',
					name: 'cond',
					start: 5,
					end: 9,
					loc: {
						start: { column: 5, line: 1 },
						end: { column: 9, line: 1 },
					},
				},
				consequent: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'Text',
							data: 'text1',
							raw: 'text1',
							end: 15,
							start: 10,
						},
					],
				},
				alternate: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'IfBlock',
							elseif: true,
							start: 30,
							end: 40,
							test: {
								type: 'Identifier',
								name: 'cond',
								start: 25,
								end: 29,
								loc: {
									start: { column: 25, line: 1 },
									end: { column: 29, line: 1 },
								},
							},
							consequent: {
								type: 'Fragment',
								transparent: false,
								nodes: [
									{
										type: 'Text',
										data: 'text2',
										raw: 'text2',
										start: 30,
										end: 35,
									},
								],
							},
							alternate: null,
						},
					],
				},
			},
		]);
	});

	test('white spaces with if', () => {
		expect(svelteParse('text1  {#if cond}  text2  {/if}  ')).toEqual([
			{
				type: 'Text',
				data: 'text1  ',
				raw: 'text1  ',
				start: 0,
				end: 7,
			},
			{
				type: 'IfBlock',
				elseif: false,
				start: 7,
				end: 31,
				test: {
					type: 'Identifier',
					name: 'cond',
					start: 12,
					end: 16,
					loc: {
						start: { column: 12, line: 1 },
						end: { column: 16, line: 1 },
					},
				},
				consequent: {
					type: 'Fragment',
					transparent: false,
					nodes: [
						{
							type: 'Text',
							data: '  text2  ',
							raw: '  text2  ',
							start: 17,
							end: 26,
						},
					],
				},
				alternate: null,
			},
		]);
	});
});

describe('Issues', () => {
	test('#991', () => {
		expect(svelteParse("<CustomElement><div>Evaluation doesn't work</div></CustomElement>")).toEqual([
			{
				type: 'Component',
				name: 'CustomElement',
				start: 0,
				end: 65,
				attributes: [],
				fragment: {
					type: 'Fragment',
					transparent: true,
					nodes: [
						{
							type: 'RegularElement',
							name: 'div',
							start: 15,
							end: 49,
							attributes: [],
							fragment: {
								type: 'Fragment',
								transparent: true,
								nodes: [
									{
										type: 'Text',
										start: 20,
										end: 43,
										data: "Evaluation doesn't work",
										raw: "Evaluation doesn't work",
									},
								],
							},
						},
					],
				},
			},
		]);
	});

	test('#1286', () => {
		const ast = svelteParse('{#each list as item, i (`${i}-${i}`)}{/each}');
		expect(ast).toEqual([
			{
				type: 'EachBlock',
				start: 0,
				end: 44,
				body: {
					type: 'Fragment',
					transparent: false,
					nodes: [],
				},
				context: {
					type: 'Identifier',
					typeAnnotation: undefined,
					name: 'item',
					start: 15,
					end: 19,
					loc: {
						end: {
							character: 19,
							column: 19,
							line: 1,
						},
						start: {
							character: 15,
							column: 15,
							line: 1,
						},
					},
				},
				expression: {
					type: 'Identifier',
					name: 'list',
					start: 7,
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
				},
				key: {
					type: 'TemplateLiteral',
					start: 24,
					end: 35,
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
					expressions: [
						{
							type: 'Identifier',
							name: 'i',
							start: 27,
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
						},
						{
							type: 'Identifier',
							name: 'i',
							start: 32,
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
						},
					],
					quasis: [
						{
							type: 'TemplateElement',
							tail: false,
							start: 25,
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
							value: {
								cooked: '',
								raw: '',
							},
						},
						{
							type: 'TemplateElement',
							tail: false,
							start: 29,
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
							value: {
								cooked: '-',
								raw: '-',
							},
						},
						{
							type: 'TemplateElement',
							tail: true,
							start: 34,
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
							value: {
								cooked: '',
								raw: '',
							},
						},
					],
				},
				index: 'i',
			},
		]);
	});

	expect(() => svelteParse('{#each list as item, i `${i}-${i}`)}{/each}')).toThrowError();
});
