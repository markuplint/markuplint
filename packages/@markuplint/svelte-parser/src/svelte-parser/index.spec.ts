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
					nodes: [
						{
							type: 'IfBlock',
							elseif: true,
							start: 15,
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

/**
 * @see https://github.com/sveltejs/svelte/blob/svelte%405.0.0-next.141/packages/svelte/src/compiler/types/template.d.ts
 */
describe('Node types', () => {
	// https://svelte.dev/docs/basic-markup
	test('RegularElement', () => expect(svelteParse('<div></div>')?.[0]?.type).toBe('RegularElement'));
	test('Component', () => expect(svelteParse('<Co></Co>')?.[0]?.type).toBe('Component'));
	test('Component (Namepace)', () => expect(svelteParse('<N.Co></N.Co>')?.[0]?.type).toBe('Component'));
	test('Text', () => expect(svelteParse('text')?.[0]?.type).toBe('Text'));
	test('ExpressionTag', () => expect(svelteParse('{e}')?.[0]?.type).toBe('ExpressionTag'));
	test('Comment', () => expect(svelteParse('<!-- c -->')?.[0]?.type).toBe('Comment'));

	// https://svelte.dev/docs/logic-blocks
	test('IfBlock', () => expect(svelteParse('{#if cond}{/if}')?.[0]?.type).toBe('IfBlock'));
	test('EachBlock', () => expect(svelteParse('{#each e as n}{/each}')?.[0]?.type).toBe('EachBlock'));
	test('AwaitBlock', () => expect(svelteParse('{#await e}{/await}')?.[0]?.type).toBe('AwaitBlock'));
	test('KeyBlock', () => expect(svelteParse('{#key e}{/key}')?.[0]?.type).toBe('KeyBlock'));
	// Since svelte/compiler@5 - @see https://svelte-5-preview.vercel.app/docs/snippets
	test('SnippetBlock', () => expect(svelteParse('{#snippet e(p)}{/snippet}')?.[0]?.type).toBe('SnippetBlock'));

	// https://svelte.dev/docs/special-tags
	test('HtmlTag', () => expect(svelteParse('{@html e}')?.[0]?.type).toBe('HtmlTag'));
	test('DebugTag', () => expect(svelteParse('{@debug e}')?.[0]?.type).toBe('DebugTag'));
	test('ConstTag', () => expect(svelteParse('{@const e = 0}')?.[0]?.type).toBe('ConstTag'));
	// Since svelte/compiler@5 - @see https://svelte-5-preview.vercel.app/docs/snippets
	test('RenderTag', () => expect(svelteParse('{@render f()}')?.[0]?.type).toBe('RenderTag'));

	// https://svelte.dev/docs/special-elements
	test('SlotElement', () => expect(svelteParse('<slot><!-- fallback --></slot>')?.[0]?.type).toBe('SlotElement'));
	test('SvelteSelf', () =>
		// @ts-ignore
		expect(svelteParse('{#if e}<svelte:self />{/if}')?.[0]?.consequent.nodes[0]?.type).toBe('SvelteSelf'));
	test('SvelteComponent', () =>
		expect(svelteParse('<svelte:component this={e} />')?.[0]?.type).toBe('SvelteComponent'));
	test('SvelteElement', () => expect(svelteParse('<svelte:element this={e} />')?.[0]?.type).toBe('SvelteElement'));
	test('SvelteWindow', () => expect(svelteParse('<svelte:window />')?.[0]?.type).toBe('SvelteWindow'));
	test('SvelteDocument', () => expect(svelteParse('<svelte:document />')?.[0]?.type).toBe('SvelteDocument'));
	test('SvelteBody', () => expect(svelteParse('<svelte:body />')?.[0]?.type).toBe('SvelteBody'));
	test('SvelteHead', () => expect(svelteParse('<svelte:head />')?.[0]?.type).toBe('SvelteHead'));
	test('SvelteFragment', () => expect(svelteParse('<svelte:fragment />')?.[0]?.type).toBe('SvelteFragment'));
	test('<svelte:options>', () => expect(svelteParse('<svelte:options />').length).toBe(0));
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
					nodes: [
						{
							type: 'RegularElement',
							name: 'div',
							start: 15,
							end: 49,
							attributes: [],
							fragment: {
								type: 'Fragment',
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
