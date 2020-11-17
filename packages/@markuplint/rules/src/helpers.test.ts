import { getRermittedRoles, getRoleSpec } from './helpers';
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

describe('getRermittedRoles', () => {
	test('the a element', async () => {
		expect(getRermittedRoles(createElement('<a></a>')!)).toBe(true);
		expect(getRermittedRoles(createElement('<a href="path/to"></a>')!)).toStrictEqual([
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
		expect(getRermittedRoles(createElement('<area></area>')!)).toBe(false);
		expect(getRermittedRoles(createElement('<area href="path/to"></area>')!)).toBe(false);
	});

	test('the figure element', async () => {
		expect(getRermittedRoles(createElement('<figure></figure>')!)).toBe(false);
		expect(getRermittedRoles(createElement('<figure><figcaption></figcaption></figure>')!)).toBe(true);
	});

	test('the img element', async () => {
		expect(getRermittedRoles(createElement('<img>')!)).toBe(false);
		expect(getRermittedRoles(createElement('<img alt="">')!)).toStrictEqual(['none', 'presentation']);
		expect(getRermittedRoles(createElement('<img alt="photo: something">')!)).toStrictEqual([
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
		expect(getRermittedRoles(createElement('<input>')!)).toBe(false);
		expect(getRermittedRoles(createElement('<input type="button">')!)).toStrictEqual([
			'link',
			'menuitem',
			'menuitemcheckbox',
			'menuitemradio',
			'option',
			'radio',
			'switch',
			'tab',
		]);
		expect(getRermittedRoles(createElement('<input type="checkbox" aria-pressed="true">')!)).toStrictEqual([
			'button',
		]);
	});
});
