import { describe, test, expect, vi } from 'vitest';

import { describeParserLoadFailure, isPretendersNotInstalled } from './parser-load-failure.js';

vi.mock('../i18n.js', () => ({
	t: (template: string, ...args: readonly unknown[]) =>
		template.replaceAll(/\{(\d+)\*?\}/g, (_, index: string) => String(args[Number(index)] ?? '')),
}));

const bundled = {
	languageId: 'html',
	isLocalModule: false,
	version: '5.4.0',
	workspace: '/repo/app',
};

const local = { ...bundled, isLocalModule: true };

/** What `MLEngine` reports for a configuration that needs `@markuplint/pretenders` when it is not installed. */
function notInstalled(name = '@markuplint/pretenders') {
	return new Error(`The "pretenders.scan" option needs ${name}, which is not installed. Add it to your project.`, {
		cause: Object.assign(
			new Error(`Cannot find package '${name}' imported from /x/file-resolver/lib/resolve-pretenders.js`),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		),
	});
}

describe('isPretendersNotInstalled', () => {
	test('is true for the error whose cause is the missing @markuplint/pretenders', () => {
		expect(isPretendersNotInstalled(notInstalled())).toBe(true);
	});

	test('is false for an error whose cause is another missing package', () => {
		expect(isPretendersNotInstalled(notInstalled('some-package'))).toBe(false);
	});

	test('is false for an error with no cause, and for a value that is not an Error', () => {
		expect(isPretendersNotInstalled(new Error('Something went wrong'))).toBe(false);
		expect(isPretendersNotInstalled('Cannot find package')).toBe(false);
		expect(isPretendersNotInstalled(null)).toBe(false);
	});
});

describe('describeParserLoadFailure for @markuplint/pretenders that is not installed', () => {
	test('tells the bundled markuplint to be installed in the workspace with it', () => {
		const message = describeParserLoadFailure(notInstalled(), bundled);

		expect(message).toContain('(v5.4.0)');
		expect(message).toContain('does not include @markuplint/pretenders');
		expect(message).toContain('Install markuplint and @markuplint/pretenders in /repo/app');
	});

	test('tells that upgrading is the fix when the local markuplint was skipped for the import assertion', () => {
		const message = describeParserLoadFailure(notInstalled(), {
			...bundled,
			fallbackReason: 'import-assertion-compat',
		});

		expect(message).toContain('@markuplint/pretenders');
		expect(message).toContain('incompatible with Node.js 22+');
	});

	test('gives the message of the error for a local markuplint, which already says how to install it', () => {
		const error = notInstalled();

		expect(describeParserLoadFailure(error, local)).toBe(error.message);
	});

	test('leaves an error whose cause is another missing package to the other checks', () => {
		expect(describeParserLoadFailure(notInstalled('some-package'), bundled)).toBeNull();
	});
});
