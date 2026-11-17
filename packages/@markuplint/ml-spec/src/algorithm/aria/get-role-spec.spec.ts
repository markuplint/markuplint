import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { getRoleSpec } from './get-role-spec.js';

describe('getRoleSpec', () => {
	test('ignores requiredContextRole and requiredOwnedElements', () => {
		const aria = specs.def['#aria'];
		const withOldNames = {
			...specs,
			def: {
				...specs.def,
				'#aria': {
					...aria,
					'1.2': {
						...aria['1.2'],
						roles: [
							...aria['1.2'].roles,
							{ name: 'x-old', requiredContextRole: ['list'], requiredOwnedElements: ['listitem'] },
						],
					},
				},
			},
		} as unknown as typeof specs;
		const role = getRoleSpec(withOldNames, 'x-old', 'http://www.w3.org/1999/xhtml', '1.2');
		expect(role?.requiredAccessibilityParentRole).toStrictEqual([]);
		expect(role?.allowedAccessibilityChildRoles).toStrictEqual([]);
	});

	test('the button role', () => {
		const role = getRoleSpec(specs, 'button', 'http://www.w3.org/1999/xhtml', '1.2');
		const superClassRoles = role?.superClassRoles.map(r => r.name);
		expect(role?.ownedProperties.map(p => p.name + (p.deprecated ? ':deprecated' : ''))).toStrictEqual([
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
		expect(role?.isAbstract).toBe(false);
		expect(superClassRoles).toStrictEqual(['command', 'widget', 'roletype']);
	});

	test('the roletype role', () => {
		const role = getRoleSpec(specs, 'roletype', 'http://www.w3.org/1999/xhtml', '1.2');
		const superClassRoles = role?.superClassRoles.map(r => r.name);
		expect(role?.ownedProperties.map(p => p.name + (p.deprecated ? ':deprecated' : ''))).toStrictEqual([
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
		expect(role?.isAbstract).toBe(true);
		expect(superClassRoles).toStrictEqual([]);
	});
});
