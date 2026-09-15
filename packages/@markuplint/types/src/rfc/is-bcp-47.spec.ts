import { test, expect } from 'vitest';

import { isBCP47 } from './is-bcp-47.js';

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

test('x-default (private use)', () => {
	expect(is('x-default')).toBe(true);
});

test('x-custom (private use)', () => {
	expect(is('x-custom')).toBe(true);
});

test('zh-Hant (registered script)', () => {
	expect(is('zh-Hant')).toBe(true);
});

test('zh-yue (registered extlang)', () => {
	expect(is('zh-yue')).toBe(true);
});

test('de-DE-1901 (registered variant)', () => {
	expect(is('de-DE-1901')).toBe(true);
});

test('i-klingon (grandfathered, preferred value tlh)', () => {
	expect(is('i-klingon')).toBe(true);
});

test('i-default (grandfathered, no preferred value)', () => {
	expect(is('i-default')).toBe(true);
});

test('mo (deprecated but registered)', () => {
	expect(is('mo')).toBe(true);
});

test('qaa (private-use language range qaa..qtz)', () => {
	expect(is('qaa')).toBe(true);
});

test('en-Qaaa (private-use script range qaaa..qabx)', () => {
	expect(is('en-Qaaa')).toBe(true);
});

test('en-XA (private-use region range xa..xz)', () => {
	expect(is('en-XA')).toBe(true);
});

test('en-u-ca-gregory (extension)', () => {
	expect(is('en-u-ca-gregory')).toBe(true);
});

test('zzz (unregistered primary language subtag)', () => {
	expect(is('zzz')).toBe(false);
});

test('bat-smg (smg is not a registered extlang)', () => {
	expect(is('bat-smg')).toBe(false);
});

test('en-Zzzz-ZY (unregistered region)', () => {
	expect(is('en-Zzzz-ZY')).toBe(false);
});

test('en-Qzzz (unregistered script)', () => {
	expect(is('en-Qzzz')).toBe(false);
});

test('de-DE-1901-1901 (duplicate variant subtags)', () => {
	expect(is('de-DE-1901-1901')).toBe(false);
});

test('en-a-bbb-a-ccc (duplicate singleton subtags)', () => {
	expect(is('en-a-bbb-a-ccc')).toBe(false);
});
