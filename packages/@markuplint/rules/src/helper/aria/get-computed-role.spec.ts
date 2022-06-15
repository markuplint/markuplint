import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { getComputedRole } from './get-computed-role';

describe('getComputedRole', () => {
	test('the a element', () => {
		expect(getComputedRole(specs, createTestElement('<a></a>')!, '1.2')).toBe(null);
		expect(getComputedRole(specs, createTestElement('<a href></a>')!, '1.2')?.name).toBe('link');
		expect(getComputedRole(specs, createTestElement('<a role="button"></a>')!, '1.2')?.name).toBe('button');
		expect(getComputedRole(specs, createTestElement('<a role="button" href></a>')!, '1.2')?.name).toBe('button');
	});
});
