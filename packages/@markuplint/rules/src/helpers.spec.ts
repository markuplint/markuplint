import { checkAria, checkAriaValue, getComputedRole, getImplicitRole, getPermittedRoles, getRoleSpec } from './helpers';
import { createTestElement } from '@markuplint/ml-core';

describe('getRoleSpec', () => {
	test('the button role', () => {
		const role = getRoleSpec('button')!;
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
		const role = getRoleSpec('roletype')!;
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
		expect(getPermittedRoles(createTestElement('<a></a>')!)).toBe(true);
		expect(getPermittedRoles(createTestElement('<a href="path/to"></a>')!)).toStrictEqual([
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
		expect(getPermittedRoles(createTestElement('<area></area>')!)).toBe(false);
		expect(getPermittedRoles(createTestElement('<area href="path/to"></area>')!)).toStrictEqual(['link']);
	});

	test('the figure element', async () => {
		expect(getPermittedRoles(createTestElement('<figure></figure>')!)).toStrictEqual(['figure']);
		expect(getPermittedRoles(createTestElement('<figure><figcaption></figcaption></figure>')!)).toBe(true);
	});

	test('the img element', async () => {
		expect(getPermittedRoles(createTestElement('<img>')!)).toStrictEqual(['img']);
		expect(getPermittedRoles(createTestElement('<img alt="">')!)).toStrictEqual(['none', 'presentation']);
		expect(getPermittedRoles(createTestElement('<img alt="photo: something">')!)).toStrictEqual([
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
		expect(getPermittedRoles(createTestElement('<input>')!)).toBe(false);
		expect(getPermittedRoles(createTestElement('<input type="button">')!)).toStrictEqual([
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
		expect(getPermittedRoles(createTestElement('<input type="checkbox" aria-pressed="true">')!)).toStrictEqual([
			'checkbox',
			'button',
		]);
	});
});

describe('getImplicitRole', () => {
	test('the a element', async () => {
		expect(getImplicitRole(createTestElement('<a></a>')!)).toBe(false);
		expect(getImplicitRole(createTestElement('<a name="foo"></a>')!)).toBe(false);
		expect(getImplicitRole(createTestElement('<a href></a>')!)).toBe('link');
		expect(getImplicitRole(createTestElement('<a href=""></a>')!)).toBe('link');
		expect(getImplicitRole(createTestElement('<a href="path/to"></a>')!)).toBe('link');
	});

	test('the area element', async () => {
		expect(getImplicitRole(createTestElement('<area />')!)).toBe(false);
		expect(getImplicitRole(createTestElement('<area shape="rect" />')!)).toBe(false);
		expect(getImplicitRole(createTestElement('<area href />')!)).toBe('link');
		expect(getImplicitRole(createTestElement('<area href="" />')!)).toBe('link');
		expect(getImplicitRole(createTestElement('<area href="path/to" />')!)).toBe('link');
	});

	test('the article element', async () => {
		expect(getImplicitRole(createTestElement('<article></article>')!)).toBe('article');
	});

	test('the aside element', async () => {
		expect(getImplicitRole(createTestElement('<aside></aside>')!)).toBe('complementary');
	});

	test('the audio element', async () => {
		expect(getImplicitRole(createTestElement('<audio></audio>')!)).toBe(false);
	});

	test('the h1 element', async () => {
		expect(getImplicitRole(createTestElement('<h1></h1>')!)).toBe('heading');
	});

	test('the header element', async () => {
		expect(getImplicitRole(createTestElement('<header></header>')!)).toBe('banner');
		expect(getImplicitRole(createTestElement('<header><article></article></header>')!)).toBe(false);
		expect(getImplicitRole(createTestElement('<header><div></div></header>')!)).toBe('banner');
		expect(getImplicitRole(createTestElement('<header><div role="article"></div></header>')!)).toBe(false);
	});
});

describe('getComputedRole', () => {
	test('the a element', async () => {
		expect(getComputedRole(createTestElement('<a></a>')!)).toBe(null);
		expect(getComputedRole(createTestElement('<a href></a>')!)?.name).toBe('link');
		expect(getComputedRole(createTestElement('<a role="button"></a>')!)?.name).toBe('button');
		expect(getComputedRole(createTestElement('<a role="button" href></a>')!)?.name).toBe('button');
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
		expect(checkAria('aria-activedescendant', 'foo').isValid).toBe(true);
		expect(checkAria('aria-activedescendant', '').isValid).toBe(true);
	});

	test('aria-atomic', () => {
		expect(checkAria('aria-atomic', '').isValid).toBe(false);
		expect(checkAria('aria-atomic', 'true').isValid).toBe(true);
		expect(checkAria('aria-atomic', 'false').isValid).toBe(true);
		expect(checkAria('aria-atomic', 'undefined').isValid).toBe(false);
	});

	test('aria-autocomplete', () => {
		expect(checkAria('aria-autocomplete', '').isValid).toBe(false);
		expect(checkAria('aria-autocomplete', 'inline').isValid).toBe(true);
		expect(checkAria('aria-autocomplete', 'list').isValid).toBe(true);
		expect(checkAria('aria-autocomplete', 'both').isValid).toBe(true);
		expect(checkAria('aria-autocomplete', 'none').isValid).toBe(true);
		expect(checkAria('aria-autocomplete', 'foo').isValid).toBe(false);
	});
});
