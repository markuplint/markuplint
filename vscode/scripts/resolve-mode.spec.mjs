import { describe, test, expect } from 'vitest';

import { resolveMode, validModes } from './resolve-mode.mjs';

describe('resolveMode', () => {
	test('returns "package" when no mode argument is given', () => {
		expect(resolveMode(['node', 'install.mjs'])).toBe('package');
	});

	test('returns "release" when "release" is given', () => {
		expect(resolveMode(['node', 'install.mjs', 'release'])).toBe('release');
	});

	test('returns "pre-package" when "pre-package" is given', () => {
		expect(resolveMode(['node', 'install.mjs', 'pre-package'])).toBe('pre-package');
	});

	test('returns "pre-release" when "pre-release" is given', () => {
		expect(resolveMode(['node', 'install.mjs', 'pre-release'])).toBe('pre-release');
	});

	test('throws on unknown mode with a message that lists valid modes', () => {
		expect(() => resolveMode(['node', 'install.mjs', 'unknown'])).toThrow(
			`Invalid mode: unknown. Valid: ${validModes.join(', ')}`,
		);
	});

	test('throws on empty-string mode (distinguished from "no argument")', () => {
		expect(() => resolveMode(['node', 'install.mjs', ''])).toThrow(/Invalid mode/);
	});
});
