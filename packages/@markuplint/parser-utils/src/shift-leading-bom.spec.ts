import { describe, test, expect } from 'vitest';

import { shiftPositions } from './shift-leading-bom.js';

describe('shiftPositions', () => {
	test('moves the offset of a token, and the column of one on the first line', () => {
		const token = { raw: 'div', offset: 0, line: 1, col: 1 };
		shiftPositions(token);
		expect(token).toStrictEqual({ raw: 'div', offset: 1, line: 1, col: 2 });
	});

	test('does not move the column of a token on a later line', () => {
		const token = { raw: 'p', offset: 5, line: 2, col: 3 };
		shiftPositions(token);
		expect(token).toStrictEqual({ raw: 'p', offset: 6, line: 2, col: 3 });
	});

	test('reaches the tokens nested in arrays and objects', () => {
		const node = {
			offset: 0,
			line: 1,
			col: 1,
			attributes: [{ offset: 5, line: 1, col: 6, name: { offset: 5, line: 1, col: 6 } }],
			childNodes: [{ offset: 10, line: 2, col: 1 }],
		};
		shiftPositions([node]);
		expect(node).toStrictEqual({
			offset: 1,
			line: 1,
			col: 2,
			attributes: [{ offset: 6, line: 1, col: 7, name: { offset: 6, line: 1, col: 7 } }],
			childNodes: [{ offset: 11, line: 2, col: 1 }],
		});
	});

	test('moves a token that is referenced twice only once', () => {
		const shared = { offset: 3, line: 1, col: 4 };
		const list = [shared, { offset: 8, line: 1, col: 9, name: shared }];
		shiftPositions(list);
		expect(shared).toStrictEqual({ offset: 4, line: 1, col: 5 });
	});

	test('moves the start and the end of a parse error', () => {
		const error = { startOffset: 0, startLine: 1, startCol: 1, endOffset: 12, endLine: 2, endCol: 4, raw: 'x' };
		shiftPositions([error]);
		expect(error).toStrictEqual({
			startOffset: 1,
			startLine: 1,
			startCol: 2,
			endOffset: 13,
			endLine: 2,
			endCol: 4,
			raw: 'x',
		});
	});

	test('returns nothing and leaves a string, a number and null as they are', () => {
		expect(shiftPositions('text')).toBeUndefined();
		expect(shiftPositions(1)).toBeUndefined();
		expect(shiftPositions(null)).toBeUndefined();
	});

	test('leaves an object that lacks one of offset, line and col as it is', () => {
		const withoutCol = { offset: 3, line: 1 };
		const withStringOffset = { offset: '3', line: 1, col: 4 };
		shiftPositions([withoutCol, withStringOffset]);
		expect(withoutCol).toStrictEqual({ offset: 3, line: 1 });
		expect(withStringOffset).toStrictEqual({ offset: '3', line: 1, col: 4 });
	});

	test('does not enter an instance of a class, which the parser may still hold', () => {
		class Cache {
			offset = 3;
			line = 1;
			col = 4;
		}
		const cache = new Cache();
		const node = { offset: 0, line: 1, col: 1, cache };
		shiftPositions([node]);
		expect(node).toMatchObject({ offset: 1, line: 1, col: 2 });
		expect(cache).toStrictEqual(new Cache());
	});

	test('moves the end of a parse error that is on the first line', () => {
		const error = { startOffset: 0, startLine: 1, startCol: 1, endOffset: 3, endLine: 1, endCol: 4 };
		shiftPositions([error]);
		expect(error).toStrictEqual({ startOffset: 1, startLine: 1, startCol: 2, endOffset: 4, endLine: 1, endCol: 5 });
	});
});
