import { describe, test, expect } from 'vitest';

import { searchNodeAtLocation } from './search-node-at-location.js';

function token(
	name: string,
	start: [number, number],
	end?: [number, number],
	closeTag?: [number, number, number, number],
) {
	return {
		name,
		startLine: start[0],
		startCol: start[1],
		...(end ? { endLine: end[0], endCol: end[1] } : {}),
		...(closeTag
			? { closeTag: { startLine: closeTag[0], startCol: closeTag[1], endLine: closeTag[2], endCol: closeTag[3] } }
			: {}),
	};
}

describe('searchNodeAtLocation', () => {
	// `<div id="a"><p class="x">a\n b</p></div>`
	const div = token('div', [1, 1], [1, 13], [2, 7, 2, 13]);
	const p = token('p', [1, 13], [1, 26], [2, 3, 2, 7]);
	const text = token('#text', [1, 26], [2, 3]);
	const nodes = [div, p, text];
	const at = (line: number, col: number) => searchNodeAtLocation(nodes, line, col)?.name ?? null;

	test('the start and the inside of a start tag are its element', () => {
		expect(at(1, 1)).toBe('div');
		expect(at(1, 12)).toBe('div');
	});

	test('the end of a range belongs to the next node', () => {
		expect(at(1, 13)).toBe('p');
		expect(at(1, 26)).toBe('#text');
	});

	test('a later line of a node that spans lines is that node', () => {
		expect(at(2, 2)).toBe('#text');
	});

	test('an end tag is its element', () => {
		expect(at(2, 3)).toBe('p');
		expect(at(2, 7)).toBe('div');
	});

	test('a position after every range is no node', () => {
		expect(at(2, 13)).toBeNull();
		expect(at(9, 1)).toBeNull();
	});

	test('a position before the first node is no node', () => {
		expect(searchNodeAtLocation([token('p', [2, 1], [2, 4])], 1, 5)).toBeNull();
	});

	test('of nodes that hold the position, the innermost is taken', () => {
		const block = token('#ml-block', [1, 13], [1, 48]);
		const nested = token('p', [1, 19], [1, 42]);
		expect(searchNodeAtLocation([token('div', [1, 1], [1, 13]), block, nested], 1, 32)?.name).toBe('p');
	});

	test('an empty token holds only its start, and does not hide the node that starts there', () => {
		const tbody = token('tbody', [1, 8], [1, 8]);
		const tr = token('tr', [1, 8], [1, 12]);
		expect(searchNodeAtLocation([token('table', [1, 1], [1, 8]), tbody, tr], 1, 8)?.name).toBe('tr');
		expect(searchNodeAtLocation([tbody], 1, 8)?.name).toBe('tbody');
	});

	test('a token without an end holds only its start', () => {
		expect(searchNodeAtLocation([token('div', [1, 1])], 1, 1)?.name).toBe('div');
		expect(searchNodeAtLocation([token('div', [1, 1])], 1, 2)).toBeNull();
	});
});
