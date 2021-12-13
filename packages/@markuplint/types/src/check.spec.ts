import { check } from './check';

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
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee 1.5x', 'Srcset').matched).toBe(true);
	expect(check('a/bb/ccc/dddd 200w, b/cc/ddd/eeee 1.5a', 'Srcset').matched).toBe(false);
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
