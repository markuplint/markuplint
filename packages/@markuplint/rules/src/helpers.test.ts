import { checkAria, checkAriaValue, getComputedRole, getImplicitRole, getPermittedRoles, getRoleSpec } from './helpers';
import { createElement } from './test-utils';

describe('getRoleSpec', () => {
	test('the button role', () => {
		const role = getRoleSpec('button')!;
		const superClassRoles = role.superClassRoles.map(r => r.name);
		expect(role.statesAndProps).toStrictEqual([
			'aria-atomic',
			'aria-busy',
			'aria-controls',
			'aria-current',
			'aria-describedby',
			'aria-details',
			'aria-disabled',
			'aria-dropeffect',
			'aria-expanded',
			'aria-flowto',
			'aria-grabbed',
			'aria-haspopup',
			'aria-hidden',
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
		expect(role.statesAndProps).toStrictEqual([
			'aria-atomic',
			'aria-busy',
			'aria-controls',
			'aria-current',
			'aria-describedby',
			'aria-details',
			'aria-dropeffect',
			'aria-flowto',
			'aria-grabbed',
			'aria-hidden',
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
		expect(getPermittedRoles(createElement('<a></a>')!)).toBe(true);
		expect(getPermittedRoles(createElement('<a href="path/to"></a>')!)).toStrictEqual([
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
		expect(getPermittedRoles(createElement('<area></area>')!)).toBe(false);
		expect(getPermittedRoles(createElement('<area href="path/to"></area>')!)).toStrictEqual(['link']);
	});

	test('the figure element', async () => {
		expect(getPermittedRoles(createElement('<figure></figure>')!)).toStrictEqual(['figure']);
		expect(getPermittedRoles(createElement('<figure><figcaption></figcaption></figure>')!)).toBe(true);
	});

	test('the img element', async () => {
		expect(getPermittedRoles(createElement('<img>')!)).toStrictEqual(['img']);
		expect(getPermittedRoles(createElement('<img alt="">')!)).toStrictEqual(['none', 'presentation']);
		expect(getPermittedRoles(createElement('<img alt="photo: something">')!)).toStrictEqual([
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
		expect(getPermittedRoles(createElement('<input>')!)).toBe(false);
		expect(getPermittedRoles(createElement('<input type="button">')!)).toStrictEqual([
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
		expect(getPermittedRoles(createElement('<input type="checkbox" aria-pressed="true">')!)).toStrictEqual([
			'checkbox',
			'button',
		]);
	});
});

describe('getImplicitRole', () => {
	test('the a element', async () => {
		expect(getImplicitRole(createElement('<a></a>')!)).toBe(false);
		expect(getImplicitRole(createElement('<a name="foo"></a>')!)).toBe(false);
		expect(getImplicitRole(createElement('<a href></a>')!)).toBe('link');
		expect(getImplicitRole(createElement('<a href=""></a>')!)).toBe('link');
		expect(getImplicitRole(createElement('<a href="path/to"></a>')!)).toBe('link');
	});

	test('the area element', async () => {
		expect(getImplicitRole(createElement('<area />')!)).toBe(false);
		expect(getImplicitRole(createElement('<area shape="rect" />')!)).toBe(false);
		expect(getImplicitRole(createElement('<area href />')!)).toBe('link');
		expect(getImplicitRole(createElement('<area href="" />')!)).toBe('link');
		expect(getImplicitRole(createElement('<area href="path/to" />')!)).toBe('link');
	});

	test('the article element', async () => {
		expect(getImplicitRole(createElement('<article></article>')!)).toBe('article');
	});

	test('the aside element', async () => {
		expect(getImplicitRole(createElement('<aside></aside>')!)).toBe('complementary');
	});

	test('the audio element', async () => {
		expect(getImplicitRole(createElement('<audio></audio>')!)).toBe(false);
	});
});

describe('getComputedRole', () => {
	test('the a element', async () => {
		expect(getComputedRole(createElement('<a></a>')!)).toBe(false);
		expect(getComputedRole(createElement('<a href></a>')!)).toBe('link');
		expect(getComputedRole(createElement('<a role="button"></a>')!)).toBe('button');
		expect(getComputedRole(createElement('<a role="button" href></a>')!)).toBe('button');
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
