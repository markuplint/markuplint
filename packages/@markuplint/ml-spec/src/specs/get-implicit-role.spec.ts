import type { ARIAVersion } from '../types';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';

import { getImplicitRole } from './get-implicit-role';

function c(html: string, version: ARIAVersion) {
	const el = createJSDOMElement(html);
	return getImplicitRole(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		selector => !!createSelector(selector, specs).match(el),
	);
}

describe('getImplicitRole', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toBe(false);
		expect(c('<a name="foo"></a>', '1.2')).toBe(false);
		expect(c('<a href></a>', '1.2')).toBe('link');
		expect(c('<a href=""></a>', '1.2')).toBe('link');
		expect(c('<a href="path/to"></a>', '1.2')).toBe('link');
	});

	test('the area element', () => {
		expect(c('<area />', '1.2')).toBe(false);
		expect(c('<area shape="rect" />', '1.2')).toBe(false);
		expect(c('<area href />', '1.2')).toBe('link');
		expect(c('<area href="" />', '1.2')).toBe('link');
		expect(c('<area href="path/to" />', '1.2')).toBe('link');
	});

	test('the article element', () => {
		expect(c('<article></article>', '1.2')).toBe('article');
	});

	test('the aside element', () => {
		expect(c('<aside></aside>', '1.2')).toBe('complementary');
	});

	test('the audio element', () => {
		expect(c('<audio></audio>', '1.2')).toBe(false);
	});

	test('the h1 element', () => {
		expect(c('<h1></h1>', '1.2')).toBe('heading');
	});

	test('the header element', () => {
		expect(c('<header></header>', '1.2')).toBe('banner');
		expect(c('<header><article></article></header>', '1.2')).toBe('generic');
		expect(c('<header><article></article></header>', '1.1')).toBe(false);
		expect(c('<header><div></div></header>', '1.2')).toBe('banner');
		expect(c('<header><div role="article"></div></header>', '1.2')).toBe('generic');
		expect(c('<header><div role="article"></div></header>', '1.1')).toBe(false);
	});
});
