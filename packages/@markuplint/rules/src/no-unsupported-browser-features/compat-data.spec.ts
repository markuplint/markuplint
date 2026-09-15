import type { SupportStatement } from '@mdn/browser-compat-data';

import { describe, test, expect } from 'vitest';

import type { TargetBrowser } from './compat-data.js';

import {
	checkAttributeSupport,
	checkElementSupport,
	checkSupport,
	isVersionSatisfied,
	parseVersion,
	toBcdBrowserId,
} from './compat-data.js';

describe('parseVersion', () => {
	test('[no-unsupported-browser-features-invalid-001] normal version', () => {
		expect(parseVersion('16.4')).toEqual([16, 4, 0]);
	});

	test('[no-unsupported-browser-features-invalid-002] three-part version', () => {
		expect(parseVersion('16.4.1')).toEqual([16, 4, 1]);
	});

	test('[no-unsupported-browser-features-invalid-003] major only', () => {
		expect(parseVersion('37')).toEqual([37, 0, 0]);
	});

	test('[no-unsupported-browser-features-invalid-004] strips ≤ prefix', () => {
		expect(parseVersion('≤37')).toEqual([37, 0, 0]);
	});

	test('[no-unsupported-browser-features-invalid-005] preview returns NaN', () => {
		expect(parseVersion('preview')[0]).toBeNaN();
	});
});

describe('isVersionSatisfied', () => {
	test('[no-unsupported-browser-features-invalid-006] exact match', () => {
		expect(isVersionSatisfied('37', '37')).toBe(true);
	});

	test('[no-unsupported-browser-features-invalid-007] target is newer', () => {
		expect(isVersionSatisfied('100', '37')).toBe(true);
	});

	test('[no-unsupported-browser-features-invalid-008] target is older', () => {
		expect(isVersionSatisfied('15', '16.4')).toBe(false);
	});

	test('[no-unsupported-browser-features-invalid-009] minor version comparison', () => {
		expect(isVersionSatisfied('16.3', '16.4')).toBe(false);
	});

	test('[no-unsupported-browser-features-invalid-010] same major, target minor is newer', () => {
		expect(isVersionSatisfied('16.5', '16.4')).toBe(true);
	});

	test('[no-unsupported-browser-features-invalid-011] patch version comparison', () => {
		expect(isVersionSatisfied('16.4.0', '16.4.1')).toBe(false);
		expect(isVersionSatisfied('16.4.1', '16.4.1')).toBe(true);
		expect(isVersionSatisfied('16.4.2', '16.4.1')).toBe(true);
	});

	test('[no-unsupported-browser-features-invalid-012] ≤ prefix in addedVersion', () => {
		expect(isVersionSatisfied('37', '≤37')).toBe(true);
		expect(isVersionSatisfied('36', '≤37')).toBe(false);
	});

	test('[no-unsupported-browser-features-invalid-013] preview returns true (treat as supported)', () => {
		expect(isVersionSatisfied('100', 'preview')).toBe(true);
	});

	test('[no-unsupported-browser-features-invalid-014] NaN target returns true', () => {
		expect(isVersionSatisfied('preview', '37')).toBe(true);
	});
});

describe('toBcdBrowserId', () => {
	test('[no-unsupported-browser-features-invalid-015] maps known browsers', () => {
		expect(toBcdBrowserId('chrome')).toBe('chrome');
		expect(toBcdBrowserId('and_chr')).toBe('chrome_android');
		expect(toBcdBrowserId('ios_saf')).toBe('safari_ios');
		expect(toBcdBrowserId('samsung')).toBe('samsunginternet_android');
		expect(toBcdBrowserId('op_mob')).toBe('opera_android');
		expect(toBcdBrowserId('android')).toBe('webview_android');
	});

	test('[no-unsupported-browser-features-invalid-016] returns null for unknown browsers', () => {
		expect(toBcdBrowserId('op_mini')).toBeNull();
		expect(toBcdBrowserId('baidu')).toBeNull();
		expect(toBcdBrowserId('unknown')).toBeNull();
	});
});

describe('checkSupport', () => {
	const target: TargetBrowser = { browser: 'chrome', version: '50', displayName: 'Chrome' };

	test('[no-unsupported-browser-features-invalid-017] undefined support returns null', () => {
		expect(checkSupport(undefined, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-018] version_added === false treated as unsupported', () => {
		const support: SupportStatement = { version_added: false };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe(false);
	});

	test('[no-unsupported-browser-features-invalid-019] version_added string - target satisfies', () => {
		const support: SupportStatement = { version_added: '37' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-020] version_added string - target does not satisfy', () => {
		const support: SupportStatement = { version_added: '60' };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe('60');
		expect(result?.targetVersion).toBe('50');
	});

	test('[no-unsupported-browser-features-invalid-021] filters out flagged entries', () => {
		const support: SupportStatement = { version_added: '37', flags: [{ type: 'preference', name: 'test' }] };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-022] filters out prefixed entries', () => {
		const support: SupportStatement = { version_added: '37', prefix: 'webkit' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-023] array support picks standard entry', () => {
		const support: SupportStatement = [{ version_added: '37', prefix: 'webkit' }, { version_added: '60' }];
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe('60');
	});

	test('[no-unsupported-browser-features-invalid-024] version_removed - feature removed before target', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '40' };
		expect(checkSupport(support, target)).not.toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-025] version_removed - feature not yet removed at target', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '60' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-026] version_removed undefined does not affect support', () => {
		const support: SupportStatement = { version_added: '10' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('[no-unsupported-browser-features-invalid-027] version_removed equal to target version — treated as unsupported', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '50' };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe(false);
		expect(result?.removedVersion).toBe('50');
	});

	test('[no-unsupported-browser-features-invalid-028] all entries flagged or prefixed — returns null (treated as supported)', () => {
		const support: SupportStatement = [
			{ version_added: '37', flags: [{ type: 'preference', name: 'test' }] },
			{ version_added: '40', prefix: 'webkit' },
		];
		expect(checkSupport(support, target)).toBeNull();
	});
});

// These async tests load BCD data via `loadBcd()` internally.
// NOTE: vitest intercepts dynamic imports, so these tests do NOT reproduce
// the `ERR_IMPORT_ATTRIBUTE_MISSING` error that occurs with Node.js native
// ESM loader on Node.js >= 22. The import path fix (`forLegacyNode`) is
// validated by Node.js-level execution, not by vitest. These tests serve
// as functional coverage for `checkElementSupport` / `checkAttributeSupport`.
//
// The `bcdPromise` cache (module-level `let`) is intentionally shared across
// tests because BCD data is immutable — reloading ~70MB per test is wasteful.
// Test execution order does not affect correctness.
//
// Assertion values depend on BCD data; if BCD updates change support versions,
// these tests may need updating.
describe('checkElementSupport', () => {
	test('[no-unsupported-browser-features-invalid-029] known element with old browser returns unsupported', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '30', displayName: 'Chrome' }];
		const results = await checkElementSupport('dialog', targets);
		expect(results.length).toBe(1);
		expect(results[0]?.browser).toBe('chrome');
	});

	test('[no-unsupported-browser-features-invalid-030] common element returns empty array', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '100', displayName: 'Chrome' }];
		const results = await checkElementSupport('div', targets);
		expect(results).toEqual([]);
	});

	test('[no-unsupported-browser-features-invalid-031] unknown element returns empty array without crashing', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '100', displayName: 'Chrome' }];
		const results = await checkElementSupport('nonexistentelement', targets);
		expect(results).toEqual([]);
	});
});

describe('checkAttributeSupport', () => {
	test('[no-unsupported-browser-features-invalid-032] known attribute with old browser returns unsupported', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '30', displayName: 'Chrome' }];
		const results = await checkAttributeSupport('video', 'controlslist', targets);
		expect(results.length).toBe(1);
		expect(results[0]?.browser).toBe('chrome');
	});

	test('[no-unsupported-browser-features-invalid-033] common attribute returns empty array', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '100', displayName: 'Chrome' }];
		const results = await checkAttributeSupport('input', 'type', targets);
		expect(results).toEqual([]);
	});

	test('[no-unsupported-browser-features-invalid-034] unknown attribute returns empty array without crashing', async () => {
		const targets: readonly TargetBrowser[] = [{ browser: 'chrome', version: '100', displayName: 'Chrome' }];
		const results = await checkAttributeSupport('div', 'data-unknown', targets);
		expect(results).toEqual([]);
	});
});
