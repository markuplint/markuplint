import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

import { getExplicitRole } from '@markuplint/ml-spec';

async function region(html: string) {
	return elementOf(`<div id="container">${html}</div>`, '[role=region]', {
		parser: (await import('@markuplint/jsx-parser')).parser,
	});
}

describe('a landmark role that requires a name', () => {
	test('[get-explicit-role-landmark-001] is not exposed when aria-labelledby refers to no element', async () => {
		const el = await region('<h2 id="h"></h2><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2')).toStrictEqual({ el, role: null, errorType: 'INVALID_LANDMARK' });
	});

	test('[get-explicit-role-landmark-002] is exposed when the value of aria-labelledby is not known', async () => {
		const el = await region('<div role="region" aria-labelledby={t}></div>');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-003] is exposed when the tree has an element whose id is not known', async () => {
		const el = await region('<h2 id={x}></h2><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-004] is not exposed when the element whose id is not known is in another tree', async () => {
		const el = await region('<template><h2 id={x}></h2></template><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});

	test('[get-explicit-role-landmark-005] is exposed when aria-labelledby refers to an element that is known', async () => {
		const el = await region('<h2 id="t"></h2><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-006] is not exposed by an empty aria-labelledby next to an element whose id is not known', async () => {
		const el = await region('<h2 id={x}></h2><div role="region" aria-labelledby=""></div>');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});

	test('[get-explicit-role-landmark-007] is not exposed by a white-space-only aria-labelledby next to an element whose id is not known', async () => {
		const el = await region('<h2 id={x}></h2><div role="region" aria-labelledby="  "></div>');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});
});
