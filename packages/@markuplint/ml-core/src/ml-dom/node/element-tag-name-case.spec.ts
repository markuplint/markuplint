import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

function createDocument(sourceCode: string, tagNameCaseSensitive?: boolean) {
	return new MLDocument(
		parser.parse(sourceCode),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		tagNameCaseSensitive === undefined ? undefined : { tagNameCaseSensitive },
	);
}

describe('MLElement#tagNameCaseSensitive', () => {
	test.each([
		[true, true],
		[false, false],
		[undefined, false],
	])('follows the document (tagNameCaseSensitive: %s)', (flag, expected) => {
		const el = createDocument('<div></div>', flag).querySelector('div');

		expect(el?.tagNameCaseSensitive).toBe(expected);
	});

	test('a type selector in another case than the tag does not match when the document tells the case apart', () => {
		const el = createDocument('<div></div>', true).querySelector('div');

		expect(el?.matches('DIV')).toBe(false);
		expect(el?.matches('div')).toBe(true);
	});

	test('a type selector in another case than the tag matches when the document does not', () => {
		const el = createDocument('<div></div>').querySelector('div');

		expect(el?.matches('DIV')).toBe(true);
		expect(el?.matches('div')).toBe(true);
	});
});
