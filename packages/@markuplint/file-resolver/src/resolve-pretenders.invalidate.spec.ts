import debug from 'debug';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { invalidatePretenderResolutionCaches } from './resolve-pretenders.js';

const state = vi.hoisted(() => ({ error: new Error('unset') }));

/**
 * What loading `@markuplint/pretenders` raises is set by each test. Vitest wraps an error thrown by a mock
 * factory in its own, which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/pretenders', () => ({
	get clearPretenderCaches() {
		throw state.error;
	},
}));

const logged: string[] = [];
const defaultLog = debug.log;

beforeEach(() => {
	logged.length = 0;
	debug.log = (...args: unknown[]) => {
		logged.push(args.map(String).join(' '));
	};
	debug.enable('ml-fr*');
});

afterEach(() => {
	debug.disable();
	debug.log = defaultLog;
});

describe('invalidatePretenderResolutionCaches', () => {
	test('is a no-op, and logs nothing, when @markuplint/pretenders is not installed', async () => {
		state.error = Object.assign(
			new Error(
				"Cannot find package '@markuplint/pretenders' imported from /project/node_modules/@markuplint/file-resolver/lib/resolve-pretenders.js",
			),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		);

		await expect(invalidatePretenderResolutionCaches()).resolves.toBeUndefined();

		expect(logged).toStrictEqual([]);
	});

	test('does not fail, and logs the cause, when it is installed but fails to load', async () => {
		state.error = Object.assign(
			new Error(
				"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/pretenders/lib/index.js",
			),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		);

		await expect(invalidatePretenderResolutionCaches()).resolves.toBeUndefined();

		expect(logged.join('\n')).toContain("Cannot find package 'some-dependency'");
	});
});
