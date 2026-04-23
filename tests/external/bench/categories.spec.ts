import { describe, expect, test } from 'vitest';

import { categories, filterByCategory, inferCategory } from './categories.ts';

describe('categories catalogue', () => {
	test('declares the nine documented category ids', () => {
		expect(categories.map(c => c.id)).toEqual([
			'content-model',
			'deprecated',
			'required-attr',
			'id-duplication',
			'assertions',
			'global-attr',
			'data-types',
			'aria',
			'invalid-attr',
		]);
	});
});

describe('inferCategory', () => {
	test.each([
		['html/elements/a/model-isvalid.html', 'content-model'],
		['html/elements/h4/model-novalid.html', 'content-model'],
		['html/obsolete/center-novalid.html', 'deprecated'],
		['html/assertions/img-missing-alt-novalid.html', 'required-attr'],
		['html/assertions/duplicate-id-novalid.html', 'id-duplication'],
		['html/assertions/section-lacks-heading-haswarn.html', 'assertions'],
		['html/attributes/lang-isvalid.html', 'global-attr'],
		['html/datatypes/url-novalid.html', 'data-types'],
		['html-aria/role-button-novalid.html', 'aria'],
		['html/elements/a-novalid.html', 'invalid-attr'],
	])('maps %s to %s', (path, expected) => {
		expect(inferCategory(path)).toBe(expected);
	});

	test('falls back to uncategorized for html-rdfa and similar', () => {
		expect(inferCategory('html-rdfa/0001-novalid.html')).toBe('uncategorized');
		expect(inferCategory('html-svg/struct-dom.html')).toBe('uncategorized');
		expect(inferCategory('langdetect/lang-en.html')).toBe('uncategorized');
	});

	test('exclude list wins over include list (model-* not treated as invalid-attr)', () => {
		// invalid-attr includes html/elements/**/*.html but excludes model-*.html
		expect(inferCategory('html/elements/a/model-isvalid.html')).toBe('content-model');
		expect(inferCategory('html/elements/a/model-novalid.html')).toBe('content-model');
	});

	test('id-duplication wins over the broader assertions category', () => {
		// html/assertions/*duplicate-id* would otherwise hit the generic assertions bucket.
		expect(inferCategory('html/assertions/foo-duplicate-id-novalid.html')).toBe('id-duplication');
	});

	test('required-attr wins over the broader assertions category', () => {
		// html/assertions/*missing* must route to required-attr, not assertions.
		expect(inferCategory('html/assertions/img-missing-alt-novalid.html')).toBe('required-attr');
	});
});

describe('filterByCategory', () => {
	test('returns only paths matching the requested category', () => {
		const paths = [
			'html/elements/a-novalid.html',
			'html/elements/a/model-isvalid.html',
			'html-aria/role-button.html',
		];
		expect(filterByCategory(paths, 'invalid-attr')).toEqual(['html/elements/a-novalid.html']);
		expect(filterByCategory(paths, 'content-model')).toEqual(['html/elements/a/model-isvalid.html']);
		expect(filterByCategory(paths, 'aria')).toEqual(['html-aria/role-button.html']);
	});

	test('returns an empty array when nothing matches', () => {
		expect(filterByCategory(['html-rdfa/foo.html'], 'aria')).toEqual([]);
	});
});
