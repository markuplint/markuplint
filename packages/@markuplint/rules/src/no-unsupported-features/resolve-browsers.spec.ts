import { describe, test, expect, afterEach } from 'vitest';

import { clearBrowserslistCache, resolveTargetBrowsers } from './resolve-browsers.js';

afterEach(() => {
	clearBrowserslistCache();
});

describe('resolveTargetBrowsers', () => {
	test('[no-unsupported-features-invalid-001] returns browsers from explicit query', () => {
		const result = resolveTargetBrowsers(undefined, { browserslist: 'chrome 100' });
		expect(result).not.toBeNull();
		const chrome = result?.find(b => b.browser === 'chrome');
		expect(chrome).toBeDefined();
		expect(chrome?.version).toBe('100');
	});

	test('[no-unsupported-features-invalid-002] returns null when no config and no filename', () => {
		const result = resolveTargetBrowsers(undefined, {});
		expect(result).toBeNull();
	});

	test('[no-unsupported-features-invalid-003] keeps minimum version for duplicate browsers', () => {
		const result = resolveTargetBrowsers(undefined, { browserslist: ['chrome 100', 'chrome 90'] });
		expect(result).not.toBeNull();
		const chrome = result?.find(b => b.browser === 'chrome');
		expect(chrome?.version).toBe('90');
	});

	test('[no-unsupported-features-invalid-004] handles hyphenated version ranges', () => {
		// ios_saf often returns ranges like "16.3-16.4"
		const result = resolveTargetBrowsers(undefined, { browserslist: 'ios_saf 16.3' });
		expect(result).not.toBeNull();
		const safari = result?.find(b => b.browser === 'safari_ios');
		expect(safari).toBeDefined();
		// Version should be a clean number, not a range
		expect(safari?.version).not.toContain('-');
	});

	test('[no-unsupported-features-invalid-005] skips unknown browsers', () => {
		// "op_mini all" is a valid browserslist query but op_mini is not mapped to BCD
		const result = resolveTargetBrowsers(undefined, { browserslist: ['chrome 100', 'op_mini all'] });
		expect(result).not.toBeNull();
		// Should only contain chrome, not op_mini
		expect(result?.every(b => b.browser !== ('opera_mini' as never))).toBe(true);
	});

	test('[no-unsupported-features-invalid-006] supports array of queries', () => {
		const result = resolveTargetBrowsers(undefined, {
			browserslist: ['chrome 100', 'firefox 100', 'safari 16'],
		});
		expect(result).not.toBeNull();
		expect(result?.length).toBeGreaterThanOrEqual(3);
	});

	test('[no-unsupported-features-invalid-007] provides display names', () => {
		const result = resolveTargetBrowsers(undefined, { browserslist: 'ie 11' });
		expect(result).not.toBeNull();
		const ie = result?.find(b => b.browser === 'ie');
		expect(ie?.displayName).toBe('Internet Explorer');
	});
});
