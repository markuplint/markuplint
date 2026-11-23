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

	test('reads the renamed and unnumbered IDs that the renumbering writes', () => {
		const renamed = {
			file: 'packages/@markuplint/rules/src/rule-a/index.spec.ts',
			id: 'rule-a-valid-001',
			to: 'rule-a-001',
		};
		const unnumbered = { file: 'packages/@markuplint/rules/src/rule-a/x.spec.ts', id: 'rule-a-valid-002' };
		expect(parseIdMap(JSON.stringify({ renamed: [renamed], unnumbered: [unnumbered] }))).toStrictEqual({
			removed: [],
			added: [],
			renamed: [renamed],
			unnumbered: [unnumbered],
		});
		expect(() => parseIdMap(JSON.stringify({ renamed: [{ file: 'a', id: 'b' }] }))).toThrow(/renamed\[0\]/);
		expect(() => parseIdMap(JSON.stringify({ unnumbered: [{ file: 'a', id: 'b', to: 'c' }] }))).toThrow(
			/unnumbered\[0\]/,
		);
	});

	test('reads the specs that the change adds about the specs themselves', () => {
		expect(parseIdMap(JSON.stringify({ policy: ['test-ids.spec.ts'] }))).toStrictEqual({
			removed: [],
			added: [],
			policy: ['test-ids.spec.ts'],
		});
		expect(() => parseIdMap(JSON.stringify({ policy: 'test-ids.spec.ts' }))).toThrow(/policy/);
		expect(() => parseIdMap(JSON.stringify({ policy: [1] }))).toThrow(/policy/);
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
