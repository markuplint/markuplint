import { test, expect } from 'vitest';

import { checkEnum } from './enum.js';

test('a case-insensitive mismatch reports the authored characters', () => {
	expect(checkEnum('FETCH', { enum: ['script', 'style'] })).toMatchObject({
		matched: false,
		raw: 'FETCH',
	});
});

test('a case-insensitive match accepts another ASCII case', () => {
	expect(checkEnum('SCRIPT', { enum: ['script', 'style'] }).matched).toBe(true);
});

test('spaces stay in the reported value when they are not allowed', () => {
	expect(checkEnum(' FETCH ', { enum: ['script', 'style'] })).toMatchObject({
		matched: false,
		raw: ' FETCH ',
	});
});

test('a case-sensitive mismatch reports the authored characters', () => {
	expect(checkEnum('SCRIPT', { enum: ['script'], caseInsensitive: false })).toMatchObject({
		matched: false,
		raw: 'SCRIPT',
		reason: 'doesnt-exist-in-enum',
	});
});

test('allowed spaces are folded only for the comparison', () => {
	expect(checkEnum(' FETCH ', { enum: ['fetch'], disallowToSurroundBySpaces: false }).matched).toBe(true);
	expect(checkEnum(' FETCH ', { enum: ['script'], disallowToSurroundBySpaces: false })).toMatchObject({
		matched: false,
		raw: ' FETCH ',
	});
});

test('spaces are ignored for the match only when the enum allows them', () => {
	expect(checkEnum(' Script ', { enum: ['script'], disallowToSurroundBySpaces: false }).matched).toBe(true);
	expect(checkEnum(' Nope ', { enum: ['script'], disallowToSurroundBySpaces: false })).toMatchObject({
		matched: false,
		raw: ' Nope ',
	});
});
