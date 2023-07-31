import { test, expect } from 'vitest';

import { resolveVersion } from './resolve-version.js';

test('output', () => {
	const aria = {
		implicitRole: 'button',
		permittedRoles: false,
	};
	const resolved = resolveVersion(aria, '1.1');
	expect(resolved.implicitRole).toBe('button');
});

test('output the specified version', () => {
	const aria = {
		implicitRole: 'button',
		permittedRoles: false,
		1.1: {
			implicitRole: 'link',
		},
	};
	const resolved = resolveVersion(aria, '1.1');
	expect(resolved.implicitRole).toBe('link');
});

test('output the latest undefined version', () => {
	const aria = {
		implicitRole: 'button',
		permittedRoles: false,
		1.1: {
			implicitRole: 'link',
		},
	};
	const resolved = resolveVersion(aria, '1.3');
	expect(resolved.implicitRole).toBe('button');
});
