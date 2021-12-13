import { isBCP47 } from './is-bcp-47';

const is = isBCP47();

test('en-us', () => {
	expect(is('en-us')).toBe(true);
});

test('ja-JP', () => {
	expect(is('ja-JP')).toBe(true);
});

test('Empty', () => {
	expect(is('')).toBe(false);
});

test('Invalid', () => {
	expect(is(':::')).toBe(false);
});

test('Surrounded by spaces', () => {
	expect(is(' en ')).toBe(false);
});
