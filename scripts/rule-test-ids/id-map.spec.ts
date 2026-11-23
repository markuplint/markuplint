import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { parseIdMap } from './id-map.ts';

const removal = {
	file: 'rule-a/index.spec.ts',
	id: 'rule-a-valid-002',
	keptIn: 'rule-a/index.spec.ts',
	keptId: 'rule-a-valid-001',
};
const addition = { file: 'rule-a/index.spec.ts', id: 'rule-a-valid-003' };

describe('id-map.json', () => {
	test('the file in the repository has the shape that the verifier reads', () => {
		const text = readFileSync(path.join(import.meta.dirname, 'id-map.json'), 'utf8');
		const map = parseIdMap(text);
		expect(Array.isArray(map.removed)).toBe(true);
		expect(Array.isArray(map.added)).toBe(true);
	});
});

describe('parseIdMap', () => {
	test('reads removals and additions, and the ones that have merged', () => {
		const text = JSON.stringify({
			removed: [removal],
			added: [addition],
			merged: { removed: [removal], added: [addition] },
		});
		expect(parseIdMap(text)).toStrictEqual({
			removed: [removal],
			added: [addition],
			merged: { removed: [removal], added: [addition] },
		});
	});

	test('takes a missing list as empty', () => {
		expect(parseIdMap('{}')).toStrictEqual({ removed: [], added: [] });
	});

	test('rejects a key that it does not know, as a typo would drop the entries without a word', () => {
		expect(() => parseIdMap(JSON.stringify({ remove: [removal] }))).toThrow(/remove/);
	});

	test('rejects an entry with a field that is missing or not a string', () => {
		expect(() => parseIdMap(JSON.stringify({ removed: [{ file: 'a', id: 'b', keptIn: 'c' }] }))).toThrow(
			/removed\[0\]/,
		);
		expect(() => parseIdMap(JSON.stringify({ added: [{ file: 'a', id: 1 }] }))).toThrow(/added\[0\]/);
	});

	test('rejects what is not an object, or a list that is not an array', () => {
		expect(() => parseIdMap('[]')).toThrow(/object/);
		expect(() => parseIdMap(JSON.stringify({ removed: {} }))).toThrow(/removed/);
	});

	test('rejects an entry with a field that it does not know', () => {
		expect(() => parseIdMap(JSON.stringify({ added: [{ ...addition, why: 'x' }] }))).toThrow(/added\[0\]/);
	});
});
