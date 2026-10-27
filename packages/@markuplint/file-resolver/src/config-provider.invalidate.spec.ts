import type * as resolvePlugins from './resolve-plugins.js';

import { expect, test, vi } from 'vitest';

import { ConfigProvider } from './config-provider.js';
import { cacheClear } from './resolve-plugins.js';

// Wraps the real `cacheClear` so that the call is recorded. This file only checks that call, and
// the mock stays out of `config-provider.spec.ts`, where the real cache is used.
vi.mock('./resolve-plugins.js', async importOriginal => {
	const actual = await importOriginal<typeof resolvePlugins>();
	return { ...actual, cacheClear: vi.fn(actual.cacheClear) };
});

test('invalidate() also clears the plugin-resolution cache (#4415)', () => {
	vi.mocked(cacheClear).mockClear();
	new ConfigProvider().invalidate();
	expect(cacheClear).toHaveBeenCalledOnce();
});

test('resolve() with cache=false clears the plugin-resolution cache through invalidate() (#4415)', async () => {
	vi.mocked(cacheClear).mockClear();
	const provider = new ConfigProvider();
	await provider.resolve({ path: '/x/target.html' } as never, [], false).catch(() => {});
	expect(cacheClear).toHaveBeenCalledOnce();
});
