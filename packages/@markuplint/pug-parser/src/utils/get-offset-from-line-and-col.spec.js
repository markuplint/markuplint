// @ts-nocheck

import { getOffsetFromLineAndCol } from './get-offset-from-line-and-col';

const text = `a
b   c
d
    e`;

test('1', () => {
	const offset = getOffsetFromLineAndCol(text, 2, 3);
	expect(offset).toBe(5);
});

test('2', () => {
	const offset = getOffsetFromLineAndCol(text, 1, 1);
	expect(offset).toBe(1);
});

test('3', () => {
	const offset = getOffsetFromLineAndCol(text, 1, 0);
	expect(offset).toBe(0);
});

test('4', () => {
	const offset = getOffsetFromLineAndCol(text, 4, 0);
	expect(offset).toBe(10);
});
