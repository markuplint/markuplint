import { describe, test, expect, vi } from 'vitest';

import {
	createParserErrorHandler,
	describeParserLoadFailure,
	extractMissingParserName,
} from './parser-load-failure.js';

vi.mock('../i18n.js', () => ({
	t: (template: string, ...args: readonly unknown[]) =>
		template.replaceAll(/\{(\d+)\*?\}/g, (_, index: string) => String(args[Number(index)] ?? '')),
}));

const bundled = {
	languageId: 'typescriptreact',
	isLocalModule: false,
	version: '5.0.0',
	workspace: '/repo/applications/app',
};

const local = { ...bundled, isLocalModule: true };

describe('extractMissingParserName', () => {
	test('extracts the package name from a POSIX absolute path rewritten by the config resolver', () => {
		expect(
			extractMissingParserName('Parser module "/repo/applications/app/@markuplint/jsx-parser" is not found.'),
		).toBe('@markuplint/jsx-parser');
	});

	test('extracts the package name from a Windows absolute path', () => {
		expect(
			extractMissingParserName('Parser module "C:\\proj\\node_modules\\@markuplint\\jsx-parser" is not found.'),
		).toBe('@markuplint/jsx-parser');
	});

	test('keeps a bare scoped specifier as-is', () => {
		expect(extractMissingParserName('Parser module "@markuplint/vue-parser" is not found.')).toBe(
			'@markuplint/vue-parser',
		);
	});

	test('handles the CommonJS "Cannot find module" message', () => {
		expect(extractMissingParserName("Cannot find module '@markuplint/jsx-parser'")).toBe('@markuplint/jsx-parser');
	});

	test('handles the ESM "Cannot find package" message', () => {
		expect(
			extractMissingParserName(
				"Cannot find package '@markuplint/svelte-parser' imported from /repo/lib/index.js",
			),
		).toBe('@markuplint/svelte-parser');
	});

	test('returns an unscoped package name unchanged', () => {
		expect(extractMissingParserName("Cannot find module 'my-parser'")).toBe('my-parser');
	});

	test('returns null for unrelated messages', () => {
		expect(extractMissingParserName('Unexpected token')).toBeNull();
	});

	test('does not treat a missing file inside an installed package as a missing parser', () => {
		expect(
			extractMissingParserName("Cannot find module '/repo/node_modules/@markuplint/ml-core/lib/index.js'"),
		).toBeNull();
		expect(extractMissingParserName("Cannot find module './parsers/custom.js'")).toBeNull();
	});

	test('does not guess a package name from a rewritten path to an unscoped or file parser', () => {
		expect(extractMissingParserName('Parser module "./parsers/custom.js" is not found.')).toBeNull();
		expect(extractMissingParserName('Parser module "/repo/app/my-parser" is not found.')).toBeNull();
	});
});

describe('describeParserLoadFailure', () => {
	const error = new Error('Parser module "/repo/applications/app/@markuplint/jsx-parser" is not found.');

	test('explains the bundled fallback and points to the working directory', () => {
		expect(describeParserLoadFailure(error, bundled)).toBe(
			'The markuplint bundled with the extension (v5.0.0) cannot load parsers installed in your workspace. Install markuplint and @markuplint/jsx-parser in /repo/applications/app, then run "Markuplint: Restart Language Server" so the extension can use the local installation.',
		);
	});

	test('asks to upgrade rather than install when the local module was skipped for import assertions', () => {
		expect(describeParserLoadFailure(error, { ...bundled, fallbackReason: 'import-assertion-compat' })).toBe(
			'The markuplint bundled with the extension (v5.0.0) cannot load @markuplint/jsx-parser from /repo/applications/app because the markuplint installed there is incompatible with Node.js 22+. Upgrade it to markuplint@4.10.0 or later, then run "Markuplint: Restart Language Server".',
		);
	});

	test('asks to install the parser when the local module is in use', () => {
		expect(describeParserLoadFailure(error, local)).toBe(
			'Parser not found. You probably need to install @markuplint/jsx-parser for documents of language typescriptreact.',
		);
	});

	test('returns null for an error that is not a parser load failure', () => {
		expect(describeParserLoadFailure(new Error('Unexpected token'), bundled)).toBeNull();
	});

	test('returns null for a non-Error value', () => {
		expect(describeParserLoadFailure('boom', bundled)).toBeNull();
	});
});

describe('createParserErrorHandler', () => {
	test('reports the described message to the error log', () => {
		const errorLog = vi.fn();
		const handler = createParserErrorHandler(bundled, errorLog);
		handler(new Error('Parser module "@markuplint/jsx-parser" is not found.'));
		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog.mock.calls[0]?.[0]).toContain('@markuplint/jsx-parser');
	});

	test('reports the original message for other errors', () => {
		const errorLog = vi.fn();
		const handler = createParserErrorHandler(bundled, errorLog);
		handler(new Error('Unexpected token'));
		expect(errorLog).toHaveBeenCalledWith('Unexpected token');
	});

	test('rethrows non-Error values', () => {
		const errorLog = vi.fn();
		const handler = createParserErrorHandler(bundled, errorLog);
		expect(() => handler('boom')).toThrow('boom');
		expect(errorLog).not.toHaveBeenCalled();
	});

	test('rethrows fatal errors such as TypeError instead of reporting them', () => {
		const errorLog = vi.fn();
		const handler = createParserErrorHandler(bundled, errorLog);
		const fatal = new TypeError('Cannot read properties of undefined');
		expect(() => handler(fatal)).toThrow(fatal);
		expect(errorLog).not.toHaveBeenCalled();
	});
});
