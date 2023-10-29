// @ts-nocheck

import { describe, test, expect } from 'vitest';

import { parseCtrlBlock } from './parse-ctrl-block.js';
import { svelteParse } from './svelte-parser/index.js';

describe('parser', () => {
	test('if', () => {
		const raw = '{#if cond}text{/if}';
		const ast = svelteParse(raw);
		expect(parseCtrlBlock('if', ast[0], raw, raw, 0, null, null, null)).toEqual([
			expect.objectContaining({
				type: 'psblock',
				startOffset: 0,
				endOffset: 10,
				startLine: 1,
				endLine: 1,
				startCol: 1,
				endCol: 11,
				raw: '{#if cond}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				childNodes: [
					expect.objectContaining({
						type: 'text',
						startOffset: 10,
						endOffset: 14,
						startLine: 1,
						endLine: 1,
						startCol: 11,
						endCol: 15,
						raw: 'text',
						nodeName: '#text',
						// parentNode: [Circular],
						prevNode: null,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					}),
				],
				isFragment: false,
				isGhost: false,
			}),
			expect.objectContaining({
				type: 'psblock',
				startOffset: 14,
				endOffset: 19,
				startLine: 1,
				endLine: 1,
				startCol: 15,
				endCol: 20,
				raw: '{/if}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				isFragment: false,
				isGhost: false,
			}),
		]);
	});

	test('if else', () => {
		const raw = '{#if cond}text1{:else}text2{/if}';
		const ast = svelteParse(raw);
		expect(parseCtrlBlock('if', ast[0], raw, raw, 0, null, null, null)).toEqual([
			expect.objectContaining({
				type: 'psblock',
				startOffset: 0,
				endOffset: 10,
				startLine: 1,
				endLine: 1,
				startCol: 1,
				endCol: 11,
				raw: '{#if cond}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				childNodes: [
					expect.objectContaining({
						type: 'text',
						startOffset: 10,
						endOffset: 15,
						startLine: 1,
						endLine: 1,
						startCol: 11,
						endCol: 16,
						raw: 'text1',
						nodeName: '#text',
						// parentNode: [Circular],
						prevNode: null,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					}),
				],
				isFragment: false,
				isGhost: false,
			}),
			expect.objectContaining({
				type: 'psblock',
				startOffset: 15,
				endOffset: 22,
				startLine: 1,
				endLine: 1,
				startCol: 16,
				endCol: 23,
				raw: '{:else}',
				nodeName: 'ElseBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				childNodes: [
					expect.objectContaining({
						type: 'text',
						startOffset: 22,
						endOffset: 27,
						startLine: 1,
						endLine: 1,
						startCol: 23,
						endCol: 28,
						raw: 'text2',
						nodeName: '#text',
						// parentNode: [Circular],
						prevNode: null,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					}),
				],
				isFragment: false,
				isGhost: false,
			}),
			expect.objectContaining({
				type: 'psblock',
				startOffset: 27,
				endOffset: 32,
				startLine: 1,
				endLine: 1,
				startCol: 28,
				endCol: 33,
				raw: '{/if}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				isFragment: false,
				isGhost: false,
			}),
		]);
	});

	test('if else if', () => {
		const raw = '{#if cond}text1{:else if cond}text2{/if}';
		const ast = svelteParse(raw);
		const ast2 = parseCtrlBlock('if', ast[0], raw, raw, 0, null, null, null);
		expect(ast2).toEqual([
			expect.objectContaining({
				type: 'psblock',
				startOffset: 0,
				endOffset: 10,
				startLine: 1,
				endLine: 1,
				startCol: 1,
				endCol: 11,
				raw: '{#if cond}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				childNodes: [
					expect.objectContaining({
						type: 'text',
						startOffset: 10,
						endOffset: 15,
						startLine: 1,
						endLine: 1,
						startCol: 11,
						endCol: 16,
						raw: 'text1',
						nodeName: '#text',
						// parentNode: [Circular],
						prevNode: null,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					}),
				],
				isFragment: false,
				isGhost: false,
			}),
			expect.objectContaining({
				type: 'psblock',
				startOffset: 15,
				endOffset: 30,
				startLine: 1,
				endLine: 1,
				startCol: 16,
				endCol: 31,
				raw: '{:else if cond}',
				nodeName: 'ElseIfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				childNodes: [
					expect.objectContaining({
						type: 'text',
						startOffset: 30,
						endOffset: 35,
						startLine: 1,
						endLine: 1,
						startCol: 31,
						endCol: 36,
						raw: 'text2',
						nodeName: '#text',
						// parentNode: [Circular],
						prevNode: null,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					}),
				],
				isFragment: false,
				isGhost: false,
			}),
			expect.objectContaining({
				type: 'psblock',
				startOffset: 35,
				endOffset: 40,
				startLine: 1,
				endLine: 1,
				startCol: 36,
				endCol: 41,
				raw: '{/if}',
				nodeName: 'IfBlock',
				parentNode: null,
				prevNode: null,
				nextNode: null,
				isFragment: false,
				isGhost: false,
			}),
		]);
	});

	test('if else if else if else if...', () => {
		const raw =
			'{#if cond}text1{:else if cond}text2{:else if cond}text3{:else if cond}text4{:else if cond}text5{/if}';
		const ast = svelteParse(raw);
		const ast2 = parseCtrlBlock('if', ast[0], raw, raw, 0, null, null, null);
		expect(ast2.length).toBe(6);
	});

	test('white spaces and line breaks', () => {
		const raw = `  {#if cond}
	text1
{:else if cond}
    text2
  {:else if cond}
	text3
{/if}

`;
		const ast = svelteParse(raw);
		const ast2 = parseCtrlBlock('if', ast[0], raw, raw, 0, null, null, null);
		expect(ast2.length).toBe(4);
	});
});
