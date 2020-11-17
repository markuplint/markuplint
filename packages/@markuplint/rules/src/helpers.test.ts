import { createElement } from './test-utils';
import { getRoleSpec } from './helpers';

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
