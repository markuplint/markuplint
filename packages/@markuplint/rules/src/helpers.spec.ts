import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { checkAria, checkAriaValue, getComputedRole, getImplicitRole, getPermittedRoles, getRoleSpec } from './helpers';

describe('getRoleSpec', () => {
	test('the button role', () => {
		const role = getRoleSpec(specs, 'button')!;
		const superClassRoles = role.superClassRoles.map(r => r.name);
		expect(role.statesAndProps.map(p => p.name + (p.deprecated ? ':deprecated' : ''))).toStrictEqual([
			'aria-atomic',
			'aria-busy',
			'aria-controls',
			'aria-current',
			'aria-describedby',
			'aria-details',
			'aria-disabled',
			'aria-dropeffect',
			'aria-errormessage:deprecated',
			'aria-expanded',
			'aria-flowto',
			'aria-grabbed',
			'aria-haspopup',
			'aria-hidden',
			'aria-invalid:deprecated',
			'aria-keyshortcuts',
			'aria-label',
			'aria-labelledby',
			'aria-live',
			'aria-owns',
			'aria-pressed',
			'aria-relevant',
			'aria-roledescription',
		]);
		expect(role.isAbstract).toBe(false);
		expect(superClassRoles).toStrictEqual(['command', 'widget', 'roletype']);
	});

	test('the roletype role', () => {
		const role = getRoleSpec(specs, 'roletype')!;
		const superClassRoles = role.superClassRoles.map(r => r.name);
		expect(role.statesAndProps.map(p => p.name + (p.deprecated ? ':deprecated' : ''))).toStrictEqual([
			'aria-atomic',
			'aria-busy',
			'aria-controls',
			'aria-current',
			'aria-describedby',
			'aria-details',
			'aria-disabled:deprecated',
			'aria-dropeffect',
			'aria-errormessage:deprecated',
			'aria-flowto',
			'aria-grabbed',
			'aria-haspopup:deprecated',
			'aria-hidden',
			'aria-invalid:deprecated',
			'aria-keyshortcuts',
			'aria-label',
			'aria-labelledby',
			'aria-live',
			'aria-owns',
			'aria-relevant',
			'aria-roledescription',
		]);
		expect(role.isAbstract).toBe(true);
		expect(superClassRoles).toStrictEqual([]);
	});
});

describe('getPermittedRoles', () => {
	test('the a element', async () => {
		expect(getPermittedRoles(specs, createTestElement('<a></a>')!)).toBe(true);
		expect(getPermittedRoles(specs, createTestElement('<a href="path/to"></a>')!)).toStrictEqual([
			'link',
			'button',
			'checkbox',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
			'treeitem',
		]);
	});

	test('the area element', async () => {
		expect(getPermittedRoles(specs, createTestElement('<area></area>')!)).toBe(false);
		expect(getPermittedRoles(specs, createTestElement('<area href="path/to"></area>')!)).toStrictEqual(['link']);
	});

	test('the figure element', async () => {
		expect(getPermittedRoles(specs, createTestElement('<figure></figure>')!)).toStrictEqual(['figure']);
		expect(getPermittedRoles(specs, createTestElement('<figure><figcaption></figcaption></figure>')!)).toBe(true);
	});

	test('the img element', async () => {
		expect(getPermittedRoles(specs, createTestElement('<img>')!)).toStrictEqual(['img']);
		expect(getPermittedRoles(specs, createTestElement('<img alt="">')!)).toStrictEqual(['presentation']);
		expect(getPermittedRoles(specs, createTestElement('<img alt="photo: something">')!)).toStrictEqual([
			'img',
			'button',
			'checkbox',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'progressbar',
			'scrollbar',
			'separator',
			'slider',
			'switch',
			'tab',
			'treeitem',
		]);
	});

	test('the input element', async () => {
		expect(getPermittedRoles(specs, createTestElement('<input>')!)).toBe(false);
		expect(getPermittedRoles(specs, createTestElement('<input type="button">')!)).toStrictEqual([
			'button',
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);
		expect(
			getPermittedRoles(specs, createTestElement('<input type="checkbox" aria-pressed="true">')!),
		).toStrictEqual(['checkbox', 'button']);
	});
});

describe('getImplicitRole', () => {
	test('the a element', async () => {
		expect(getImplicitRole(specs, createTestElement('<a></a>')!)).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<a name="foo"></a>')!)).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<a href></a>')!)).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<a href=""></a>')!)).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<a href="path/to"></a>')!)).toBe('link');
	});

	test('the area element', async () => {
		expect(getImplicitRole(specs, createTestElement('<area />')!)).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<area shape="rect" />')!)).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<area href />')!)).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<area href="" />')!)).toBe('link');
		expect(getImplicitRole(specs, createTestElement('<area href="path/to" />')!)).toBe('link');
	});

	test('the article element', async () => {
		expect(getImplicitRole(specs, createTestElement('<article></article>')!)).toBe('article');
	});

	test('the aside element', async () => {
		expect(getImplicitRole(specs, createTestElement('<aside></aside>')!)).toBe('complementary');
	});

	test('the audio element', async () => {
		expect(getImplicitRole(specs, createTestElement('<audio></audio>')!)).toBe(false);
	});

	test('the h1 element', async () => {
		expect(getImplicitRole(specs, createTestElement('<h1></h1>')!)).toBe('heading');
	});

	test('the header element', async () => {
		expect(getImplicitRole(specs, createTestElement('<header></header>')!)).toBe('banner');
		expect(getImplicitRole(specs, createTestElement('<header><article></article></header>')!)).toBe(false);
		expect(getImplicitRole(specs, createTestElement('<header><div></div></header>')!)).toBe('banner');
		expect(getImplicitRole(specs, createTestElement('<header><div role="article"></div></header>')!)).toBe(false);
	});
});

describe('getComputedRole', () => {
	test('the a element', async () => {
		expect(getComputedRole(specs, createTestElement('<a></a>')!)).toBe(null);
		expect(getComputedRole(specs, createTestElement('<a href></a>')!)?.name).toBe('link');
		expect(getComputedRole(specs, createTestElement('<a role="button"></a>')!)?.name).toBe('button');
		expect(getComputedRole(specs, createTestElement('<a role="button" href></a>')!)?.name).toBe('button');
	});
});

describe('checkAriaValue', () => {
	test('token', () => {
		expect(checkAriaValue('token', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token', 'a', ['b'])).toBe(false);
	});

	test('token list', () => {
		expect(checkAriaValue('token list', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token list', 'a', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a', 'b'])).toBe(true);
		expect(checkAriaValue('token list', 'a b', ['a', 'b', 'c'])).toBe(true);
		expect(checkAriaValue('token list', 'a b d', ['a', 'b', 'c'])).toBe(false);
	});

	test('integer', () => {
		expect(checkAriaValue('integer', '1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
	});

	test('number', () => {
		expect(checkAriaValue('number', '1', [])).toBe(true);
		expect(checkAriaValue('number', '-1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1.1', [])).toBe(false);
	});
});

describe('checkAria', () => {
	test('aria-activedescendant', () => {
		expect(checkAria(specs, 'aria-activedescendant', 'foo').isValid).toBe(true);
		expect(checkAria(specs, 'aria-activedescendant', '').isValid).toBe(true);
	});

	test('aria-atomic', () => {
		expect(checkAria(specs, 'aria-atomic', '').isValid).toBe(false);
		expect(checkAria(specs, 'aria-atomic', 'true').isValid).toBe(true);
		expect(checkAria(specs, 'aria-atomic', 'false').isValid).toBe(true);
		expect(checkAria(specs, 'aria-atomic', 'undefined').isValid).toBe(false);
	});

	test('aria-autocomplete', () => {
		expect(checkAria(specs, 'aria-autocomplete', '').isValid).toBe(false);
		expect(checkAria(specs, 'aria-autocomplete', 'inline').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'list').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'both').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'none').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'foo').isValid).toBe(false);
	});
});
