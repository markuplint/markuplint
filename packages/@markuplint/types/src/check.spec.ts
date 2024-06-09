import { test, expect } from 'vitest';

import { check } from './check.js';

test('Any', () => {
	expect(check('', 'Any').matched).toBe(true);
	expect(check(' ', 'Any').matched).toBe(true);
	expect(check('a', 'Any').matched).toBe(true);
});

test('NoEmptyAny', () => {
	expect(check('', 'NoEmptyAny').matched).toBe(false);
	expect(check(' ', 'NoEmptyAny').matched).toBe(true);
	expect(check('a', 'NoEmptyAny').matched).toBe(true);
});

test('OneLineAny', () => {
	expect(check('', 'OneLineAny').matched).toBe(true);
	expect(check(' ', 'OneLineAny').matched).toBe(true);
	expect(check('a', 'OneLineAny').matched).toBe(true);
	expect(check('a ', 'OneLineAny').matched).toBe(true);
	expect(check('a b', 'OneLineAny').matched).toBe(true);
	expect(check('a\n', 'OneLineAny').matched).toBe(false);
	expect(check('a\nb', 'OneLineAny').matched).toBe(false);
	expect(check('a\r\nb', 'OneLineAny').matched).toBe(false);
	expect(check('a\rb', 'OneLineAny').matched).toBe(false);
});

test('Pattern', () => {
	expect(check('.*', 'Pattern').matched).toBe(true);
	expect(check('[a-z]+', 'Pattern').matched).toBe(true);
	expect(check(']//[()?!+*', 'Pattern').matched).toBe(false);
});

test('BCP47', () => {
	expect(check('en', 'BCP47').matched).toBe(true);
	expect(check('en-US', 'BCP47').matched).toBe(true);
	expect(check('ja', 'BCP47').matched).toBe(true);
	expect(check(' ja ', 'BCP47').matched).toBe(false);
	expect(check('', 'BCP47').matched).toBe(false);
	expect(check('zh/cn', 'BCP47').matched).toBe(false);
});

test('Srcset', () => {
	expect(check('a/bb/ccc/dddd', 'Srcset').matched).toBe(true);
	expect(check('a/bb/ccc/dddd 200w', 'Srcset').matched).toBe(true);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x ', 'Srcset').matched).toBe(true);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5a', 'Srcset').matched).toBe(false);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee  1.5x  unexpected-string', 'Srcset').matched).toBe(false);
	// Issue #1171
	expect(check('/path/to/file 1x, /path/to/file@2x 2x', 'Srcset').matched).toBe(true);
});

test('IconSize', () => {
	expect(check('any', 'IconSize').matched).toBe(true);
	expect(check('Any', 'IconSize').matched).toBe(true);
	expect(check('10x10', 'IconSize').matched).toBe(true);
	expect(check('1x1', 'IconSize').matched).toBe(true);
	expect(check('1x0', 'IconSize').matched).toBe(false);
	expect(check('0x1', 'IconSize').matched).toBe(false);
	expect(check('0x0', 'IconSize').matched).toBe(false);
	expect(check('', 'IconSize').matched).toBe(false);
	expect(check(' ', 'IconSize').matched).toBe(false);
	expect(check('1', 'IconSize').matched).toBe(false);
	expect(check('1x', 'IconSize').matched).toBe(false);
	expect(check('x1', 'IconSize').matched).toBe(false);
});

test('Number', () => {
	expect(check('10', { type: 'integer', gt: 0 }).matched).toBe(true);
	expect(check('0', { type: 'integer', gt: 0 }).matched).toBe(false);
	expect(check('0', { type: 'integer', gte: 0 }).matched).toBe(true);
	expect(check('9', { type: 'integer', lt: 10 }).matched).toBe(true);
	expect(check('10', { type: 'integer', lt: 10 }).matched).toBe(false);
});

test('Non-exist types', () => {
	// @ts-ignore
	expect(check('abc', 'String').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', 'FooBar').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', ' ').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', '\n').matched).toBe(true);
	// @ts-ignore
	expect(check('abc', '').matched).toBe(true);
});

test('ItemProp', () => {
	expect(check('itemListElement', 'ItemProp').matched).toBe(true);
	expect(check('item', 'ItemProp').matched).toBe(true);
	expect(check('position', 'ItemProp').matched).toBe(true);
});

test('legacy-transform', () => {
	expect(check('translate(300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300 300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px 300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300 , 300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px , 300px)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300,300)', "<'transform'>").matched).toBeTruthy();
	expect(check('translate(300px,300px)', "<'transform'>").matched).toBeTruthy();
});

test('directive', () => {
	const directive = {
		directive: ['/^closest\\s+(?<token>.+)$/', '/^previous\\s+(?<token>.+)$/', 'next '],
		token: '<complex-selector-list>',
	} as const;

	expect(check('closest #id', directive)).toBeTruthy();
	expect(check('closest .class', directive).matched).toBeTruthy();
	expect(check('closest type', directive).matched).toBeTruthy();
	expect(check('closes type', directive).matched).toBeFalsy();
	expect(check('previous #id', directive).matched).toBeTruthy();
	expect(check('previous .class', directive).matched).toBeTruthy();
	expect(check('previous type', directive).matched).toBeTruthy();
	expect(check('prev #id', directive).matched).toBeFalsy();
	expect(check('next #id', directive).matched).toBeTruthy();
	expect(check('nex #id', directive).matched).toBeFalsy();
	expect(check(' next #id', directive).matched).toBeFalsy();
});

test('JSON', () => {
	expect(check('{"a": 1}', 'JSON').matched).toBeTruthy();
	expect(check('{"a": 1', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1,}', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1, "b": 2}', 'JSON').matched).toBeTruthy();
	expect(check('{"a": 1, "b": 2', 'JSON').matched).toBeFalsy();
	expect(check('{"a": 1, "b": 2,}', 'JSON').matched).toBeFalsy();
});
