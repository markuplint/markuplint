import { describe, test, expect } from 'vitest';

import { isPresentational, isTransparentForOwnership } from './is-presentational.js';

describe('isPresentational', () => {
	test('presentation', () => {
		expect(isPresentational('presentation')).toBe(true);
	});

	test('none', () => {
		expect(isPresentational('none')).toBe(true);
	});

	test('generic', () => {
		expect(isPresentational('generic')).toBe(false);
	});

	test('other roles', () => {
		expect(isPresentational('button')).toBe(false);
		expect(isPresentational('link')).toBe(false);
		expect(isPresentational('heading')).toBe(false);
	});

	test('undefined', () => {
		expect(isPresentational()).toBe(false);
		expect(isPresentational()).toBe(false);
	});
});

describe('isTransparentForOwnership', () => {
	test('presentation is transparent in all versions', () => {
		expect(isTransparentForOwnership('presentation', '1.1')).toBe(true);
		expect(isTransparentForOwnership('presentation', '1.2')).toBe(true);
		expect(isTransparentForOwnership('presentation', '1.3')).toBe(true);
	});

	test('none is transparent in all versions', () => {
		expect(isTransparentForOwnership('none', '1.1')).toBe(true);
		expect(isTransparentForOwnership('none', '1.2')).toBe(true);
		expect(isTransparentForOwnership('none', '1.3')).toBe(true);
	});

	test('generic is transparent ONLY in 1.3', () => {
		expect(isTransparentForOwnership('generic', '1.1')).toBe(false);
		expect(isTransparentForOwnership('generic', '1.2')).toBe(false);
		expect(isTransparentForOwnership('generic', '1.3')).toBe(true);
	});

	test('other roles are not transparent', () => {
		expect(isTransparentForOwnership('button', '1.3')).toBe(false);
		expect(isTransparentForOwnership('link', '1.3')).toBe(false);
		expect(isTransparentForOwnership('heading', '1.3')).toBe(false);
		expect(isTransparentForOwnership('list', '1.3')).toBe(false);
	});

	test('undefined is not transparent', () => {
		expect(isTransparentForOwnership(undefined, '1.2')).toBe(false);
		expect(isTransparentForOwnership(undefined, '1.3')).toBe(false);
	});
});
