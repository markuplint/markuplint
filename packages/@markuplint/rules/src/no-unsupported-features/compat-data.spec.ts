import type { SupportStatement } from '@mdn/browser-compat-data';

import { describe, test, expect } from 'vitest';

import type { TargetBrowser } from './compat-data.js';

import { checkSupport, isVersionSatisfied, parseVersion, toBcdBrowserId } from './compat-data.js';

describe('parseVersion', () => {
	test('normal version', () => {
		expect(parseVersion('16.4')).toEqual([16, 4, 0]);
	});

	test('three-part version', () => {
		expect(parseVersion('16.4.1')).toEqual([16, 4, 1]);
	});

	test('major only', () => {
		expect(parseVersion('37')).toEqual([37, 0, 0]);
	});

	test('strips ≤ prefix', () => {
		expect(parseVersion('≤37')).toEqual([37, 0, 0]);
	});

	test('preview returns NaN', () => {
		expect(parseVersion('preview')[0]).toBeNaN();
	});
});

describe('isVersionSatisfied', () => {
	test('exact match', () => {
		expect(isVersionSatisfied('37', '37')).toBe(true);
	});

	test('target is newer', () => {
		expect(isVersionSatisfied('100', '37')).toBe(true);
	});

	test('target is older', () => {
		expect(isVersionSatisfied('15', '16.4')).toBe(false);
	});

	test('minor version comparison', () => {
		expect(isVersionSatisfied('16.3', '16.4')).toBe(false);
	});

	test('same major, target minor is newer', () => {
		expect(isVersionSatisfied('16.5', '16.4')).toBe(true);
	});

	test('patch version comparison', () => {
		expect(isVersionSatisfied('16.4.0', '16.4.1')).toBe(false);
		expect(isVersionSatisfied('16.4.1', '16.4.1')).toBe(true);
		expect(isVersionSatisfied('16.4.2', '16.4.1')).toBe(true);
	});

	test('≤ prefix in addedVersion', () => {
		expect(isVersionSatisfied('37', '≤37')).toBe(true);
		expect(isVersionSatisfied('36', '≤37')).toBe(false);
	});

	test('preview returns true (treat as supported)', () => {
		expect(isVersionSatisfied('100', 'preview')).toBe(true);
	});

	test('NaN target returns true', () => {
		expect(isVersionSatisfied('preview', '37')).toBe(true);
	});
});

describe('toBcdBrowserId', () => {
	test('maps known browsers', () => {
		expect(toBcdBrowserId('chrome')).toBe('chrome');
		expect(toBcdBrowserId('and_chr')).toBe('chrome_android');
		expect(toBcdBrowserId('ios_saf')).toBe('safari_ios');
		expect(toBcdBrowserId('samsung')).toBe('samsunginternet_android');
		expect(toBcdBrowserId('op_mob')).toBe('opera_android');
		expect(toBcdBrowserId('android')).toBe('webview_android');
	});

	test('returns null for unknown browsers', () => {
		expect(toBcdBrowserId('op_mini')).toBeNull();
		expect(toBcdBrowserId('baidu')).toBeNull();
		expect(toBcdBrowserId('unknown')).toBeNull();
	});
});

describe('checkSupport', () => {
	const target: TargetBrowser = { browser: 'chrome', version: '50', displayName: 'Chrome' };

	test('undefined support returns null', () => {
		expect(checkSupport(undefined, target)).toBeNull();
	});

	test('version_added === false treated as unsupported', () => {
		const support: SupportStatement = { version_added: false };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe(false);
	});

	test('version_added string - target satisfies', () => {
		const support: SupportStatement = { version_added: '37' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('version_added string - target does not satisfy', () => {
		const support: SupportStatement = { version_added: '60' };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe('60');
		expect(result?.targetVersion).toBe('50');
	});

	test('filters out flagged entries', () => {
		const support: SupportStatement = { version_added: '37', flags: [{ type: 'preference', name: 'test' }] };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('filters out prefixed entries', () => {
		const support: SupportStatement = { version_added: '37', prefix: 'webkit' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('array support picks standard entry', () => {
		const support: SupportStatement = [{ version_added: '37', prefix: 'webkit' }, { version_added: '60' }];
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe('60');
	});

	test('version_removed - feature removed before target', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '40' };
		expect(checkSupport(support, target)).not.toBeNull();
	});

	test('version_removed - feature not yet removed at target', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '60' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('version_removed undefined does not affect support', () => {
		const support: SupportStatement = { version_added: '10' };
		expect(checkSupport(support, target)).toBeNull();
	});

	test('version_removed equal to target version — treated as unsupported', () => {
		const support: SupportStatement = { version_added: '10', version_removed: '50' };
		const result = checkSupport(support, target);
		expect(result).not.toBeNull();
		expect(result?.addedVersion).toBe(false);
		expect(result?.removedVersion).toBe('50');
	});

	test('all entries flagged or prefixed — returns null (treated as supported)', () => {
		const support: SupportStatement = [
			{ version_added: '37', flags: [{ type: 'preference', name: 'test' }] },
			{ version_added: '40', prefix: 'webkit' },
		];
		expect(checkSupport(support, target)).toBeNull();
	});
});
