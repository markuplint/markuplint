import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { getImplicitRole } from './get-implicit-role';

describe('getImplicitRole', () => {
	test('the a element', () => {
		expect(getImplicitRole(specs, createTestElement('<a></a>')!, '1.2')).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<a name="foo"></a>')!, '1.2')).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<a href></a>')!, '1.2')).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<a href=""></a>')!, '1.2')).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<a href="path/to"></a>')!, '1.2')).toBe('link');
	});

	test('the area element', () => {
		expect(getImplicitRole(specs, createTestElement('<area />')!, '1.2')).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<area shape="rect" />')!, '1.2')).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<area href />')!, '1.2')).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<area href="" />')!, '1.2')).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<area href="path/to" />')!, '1.2')).toBe('link');
	});

	test('the article element', () => {
		expect(getImplicitRole(specs, createTestElement('<article></article>')!, '1.2')).toBe('article');
	});

	test('the aside element', () => {
		expect(getImplicitRole(specs, createTestElement('<aside></aside>')!, '1.2')).toBe('complementary');
	});

	test('the audio element', () => {
		expect(getImplicitRole(specs, createTestElement('<audio></audio>')!, '1.2')).toBe(false);
	});

	test('the h1 element', () => {
		expect(getImplicitRole(specs, createTestElement('<h1></h1>')!, '1.2')).toBe('heading');
	});

	test('the header element', () => {
		expect(getImplicitRole(specs, createTestElement('<header></header>')!, '1.2')).toBe('banner');
		expect(getImplicitRole(specs, createTestElement('<header><article></article></header>')!, '1.2')).toBe(
			'generic',
		);
		expect(getImplicitRole(specs, createTestElement('<header><article></article></header>')!, '1.1')).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<header><div></div></header>')!, '1.2')).toBe('banner');
		expect(getImplicitRole(specs, createTestElement('<header><div role="article"></div></header>')!, '1.2')).toBe(
			'generic',
		);
		expect(getImplicitRole(specs, createTestElement('<header><div role="article"></div></header>')!, '1.1')).toBe(
			false,
		);
	});
});
