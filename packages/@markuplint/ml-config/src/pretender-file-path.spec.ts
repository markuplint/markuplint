import { describe, test, expect } from 'vitest';

import { parsePretenderFilePath, formatPretenderFilePath, rebasePretenderFilePath } from './pretender-file-path.js';

describe('parsePretenderFilePath', () => {
	test('parses a well-formed location', () => {
		expect(parsePretenderFilePath('components/Button.tsx:12:4')).toStrictEqual({
			path: 'components/Button.tsx',
			line: '12',
			col: '4',
		});
	});

	test('handles a path that itself contains colons (e.g. a Windows drive letter)', () => {
		expect(parsePretenderFilePath('C:\\project\\Button.tsx:12:4')).toStrictEqual({
			path: 'C:\\project\\Button.tsx',
			line: '12',
			col: '4',
		});
	});

	test('returns null for a string with no trailing line:col', () => {
		expect(parsePretenderFilePath('components/Button.tsx')).toBeNull();
	});
});

describe('formatPretenderFilePath', () => {
	test('formats a location back into the canonical string', () => {
		expect(formatPretenderFilePath({ path: 'components/Button.tsx', line: '12', col: '4' })).toBe(
			'components/Button.tsx:12:4',
		);
	});
});

describe('rebasePretenderFilePath', () => {
	test('applies the transform to the path portion only, leaving line:col untouched', () => {
		const pretender = { selector: 'Button', as: 'button', filePath: 'components/Button.tsx:12:4' };
		const result = rebasePretenderFilePath(pretender, p => `/abs/${p}`);
		expect(result).toStrictEqual({
			selector: 'Button',
			as: 'button',
			filePath: '/abs/components/Button.tsx:12:4',
		});
	});

	test('returns the same pretender unchanged when filePath is absent', () => {
		const pretender = { selector: 'Button', as: 'button' };
		expect(rebasePretenderFilePath(pretender, p => `/abs/${p}`)).toStrictEqual(pretender);
	});

	test('returns the same pretender unchanged when filePath does not match the expected format', () => {
		const pretender = { selector: 'Button', as: 'button', filePath: 'not-a-location' };
		expect(rebasePretenderFilePath(pretender, p => `/abs/${p}`)).toStrictEqual(pretender);
	});
});
