import type * as ResolveVersionModule from '../../utils/resolve-version.js';

import specs from '@markuplint/html-spec';
import { describe, test, expect, vi } from 'vitest';

import { resolveVersion } from '../../utils/resolve-version.js';

import { getARIA } from './get-aria.js';

vi.mock('../../utils/resolve-version.js', async importOriginal => {
	const actual = await importOriginal<typeof ResolveVersionModule>();
	return { ...actual, resolveVersion: vi.fn(actual.resolveVersion) };
});

describe('getARIA — the cache is per spec', () => {
	const noMatch = () => false;
	const xhtml = 'http://www.w3.org/1999/xhtml';

	/** A copy of the base spec in which the `button` element has another implicit role. */
	function withButtonRole(implicitRole: string) {
		return {
			...specs,
			specs: specs.specs.map(spec =>
				spec.name === 'button' ? { ...spec, aria: { ...spec.aria, implicitRole } } : spec,
			),
		} as unknown as typeof specs;
	}

	test('a spec that overrides the ARIA of an element is not answered with the cached ARIA of another spec', () => {
		const base = getARIA(specs, 'button', xhtml, '1.2', noMatch);
		const overridden = getARIA(withButtonRole('link'), 'button', xhtml, '1.2', noMatch);
		expect(base?.implicitRole).toBe('button');
		expect(overridden?.implicitRole).toBe('link');
	});

	test('the answer of the base spec is not changed by a spec that was asked first', () => {
		const overridden = getARIA(withButtonRole('menuitem'), 'button', xhtml, '1.1', noMatch);
		const base = getARIA(specs, 'button', xhtml, '1.1', noMatch);
		expect(overridden?.implicitRole).toBe('menuitem');
		expect(base?.implicitRole).toBe('button');
	});

	test('resolves the ARIA of an element once for a spec, however many times it is asked', () => {
		const spec = { ...specs, specs: [...specs.specs] } as typeof specs;
		vi.mocked(resolveVersion).mockClear();
		getARIA(spec, 'section', xhtml, '1.3', noMatch);
		getARIA(spec, 'section', xhtml, '1.3', noMatch);
		getARIA(spec, 'section', xhtml, '1.3', noMatch);
		expect(resolveVersion).toHaveBeenCalledTimes(1);
	});

	test('resolves it again for another spec', () => {
		const first = { ...specs, specs: [...specs.specs] } as typeof specs;
		const second = { ...specs, specs: [...specs.specs] } as typeof specs;
		vi.mocked(resolveVersion).mockClear();
		getARIA(first, 'article', xhtml, '1.3', noMatch);
		getARIA(second, 'article', xhtml, '1.3', noMatch);
		expect(resolveVersion).toHaveBeenCalledTimes(2);
	});
});
