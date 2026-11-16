import type { MLMLSpec } from '../../types/index.js';

import { describe, test, expect } from 'vitest';

import { contentModelCategoryToTagNames } from './content-model-category-to-tag-names.js';

function defOf(flow: readonly string[]) {
	return { '#contentModels': { '#flow': flow } } as unknown as MLMLSpec['def'];
}

describe('contentModelCategoryToTagNames', () => {
	test('returns the sorted tag names of the category', () => {
		expect(contentModelCategoryToTagNames('#flow', defOf(['span', 'a', 'div']))).toStrictEqual([
			'a',
			'div',
			'span',
		]);
	});

	test('returns the same array for the same definitions', () => {
		const def = defOf(['b', 'a']);
		expect(contentModelCategoryToTagNames('#flow', def)).toBe(contentModelCategoryToTagNames('#flow', def));
	});

	test('does not answer with the names that another spec defined for the category', () => {
		const first = contentModelCategoryToTagNames('#flow', defOf(['div']));
		const second = contentModelCategoryToTagNames('#flow', defOf(['div', 'my-element']));
		expect(first).toStrictEqual(['div']);
		expect(second).toStrictEqual(['div', 'my-element']);
	});

	test('returns a frozen array', () => {
		expect(Object.isFrozen(contentModelCategoryToTagNames('#flow', defOf(['a'])))).toBe(true);
	});

	test('finds a category whose key differs in case', () => {
		const def = { '#contentModels': { '#MathMLPresentation': ['mi', 'mo'] } } as unknown as MLMLSpec['def'];
		expect(contentModelCategoryToTagNames('#mathmlpresentation' as never, def)).toStrictEqual(['mi', 'mo']);
	});

	test('a category that the definitions do not have is an empty array', () => {
		expect(contentModelCategoryToTagNames('#phrasing', defOf(['div']))).toStrictEqual([]);
	});
});
