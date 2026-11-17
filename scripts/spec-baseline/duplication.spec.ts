import { describe, expect, test } from 'vitest';

import { dagStats, fieldStats, stringStats } from './duplication.ts';

describe('stringStats', () => {
	test('counts keys and values apart, with the bytes of each occurrence and of each distinct string', () => {
		const data = { a: 'xx', b: 'xx', c: ['yy', 'xx'] };
		expect(stringStats(data)).toStrictEqual({
			keys: { occurrences: 3, unique: 3, bytes: 3, uniqueBytes: 3 },
			values: { occurrences: 4, unique: 2, bytes: 8, uniqueBytes: 4 },
		});
	});

	test('measures bytes of UTF-8, not characters', () => {
		expect(stringStats({ k: 'ü' }).values.bytes).toBe(2);
	});

	test('ignores numbers, booleans and null', () => {
		expect(stringStats({ a: 1, b: true, c: null }).values.occurrences).toBe(0);
	});
});

describe('fieldStats', () => {
	test('groups the leaves by the path with array positions removed', () => {
		const data = {
			specs: [
				{ name: 'a', flag: true },
				{ name: 'b', flag: true },
				{ name: 'a', flag: false },
			],
		};
		const stats = fieldStats(data);
		const name = stats.find(field => field.path === 'specs[].name');
		expect(name).toMatchObject({ occurrences: 3, unique: 2 });
		const flag = stats.find(field => field.path === 'specs[].flag');
		expect(flag).toMatchObject({ occurrences: 3, unique: 2 });
	});

	test('gives the zero-order entropy of the values as the bits the field needs at best', () => {
		const data = { list: ['a', 'a', 'b', 'b'] };
		const [field] = fieldStats(data);
		// two equally likely values need one bit each
		expect(field?.entropyBits).toBeCloseTo(4, 10);
	});

	test('needs no bits for a field that always has one value', () => {
		const [field] = fieldStats({ list: ['a', 'a', 'a'] });
		expect(field?.entropyBits).toBe(0);
	});

	test('collapses the keys of a dictionary-like object, which are data and not field names', () => {
		const dictionary = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key${i}`, 'v']));
		const stats = fieldStats({ attributes: dictionary });
		expect(stats.map(field => field.path)).toStrictEqual(['attributes.{}']);
		expect(stats[0]?.occurrences).toBe(20);
	});

	test('keeps the keys of a small object, which are field names', () => {
		const stats = fieldStats({ o: { x: 1, y: 2 } });
		expect(stats.map(field => field.path).toSorted()).toStrictEqual(['o.x', 'o.y']);
	});

	test('sorts by the bytes the field takes, the largest first', () => {
		const stats = fieldStats({ big: ['aaaaaaaa'], small: ['a'] });
		expect(stats.map(field => field.path)).toStrictEqual(['big[]', 'small[]']);
	});
});

describe('dagStats', () => {
	test('shares identical subtrees: the tree has more nodes than the DAG', () => {
		const shared = { x: [1, 2] };
		const stats = dagStats({ a: shared, b: { x: [1, 2] }, c: 3 }, 5);
		// tree: root, a, a.x, 1, 2, b, b.x, 1, 2, 3 = 10; DAG: root, shared object, [1,2], 1, 2, 3 = 6
		expect(stats.treeNodes).toBe(10);
		expect(stats.dagNodes).toBe(6);
	});

	test('takes objects with the same keys and values as one subtree, whatever the order of the keys', () => {
		// root, the shared object, 1 and 2
		const stats = dagStats({ a: { p: 1, q: 2 }, b: { q: 2, p: 1 } }, 5);
		expect(stats.dagNodes).toBe(4);
	});

	test('does not share a number with a string that prints the same', () => {
		const stats = dagStats([1, '1'], 5);
		expect(stats.dagNodes).toBe(3);
	});

	test('lists the repeated subtrees by the bytes that sharing them would save', () => {
		const big = { text: 'abcdefghij' };
		const stats = dagStats({ a: big, b: { ...big }, c: { ...big }, d: 1, e: 1 }, 5);
		const first = stats.repeated[0];
		expect(first).toMatchObject({ occurrences: 3, size: JSON.stringify(big).length });
		expect(first?.saving).toBe(2 * JSON.stringify(big).length);
	});

	test('does not list a subtree that occurs once', () => {
		expect(dagStats({ a: { x: 1 }, b: { y: 2 } }, 5).repeated).toStrictEqual([]);
	});

	test('lists at most the number of subtrees asked for', () => {
		const data = { a: [{ p: 'aa' }, { p: 'aa' }], b: [{ q: 'bb' }, { q: 'bb' }] };
		expect(dagStats(data, 1).repeated).toHaveLength(1);
	});
});
