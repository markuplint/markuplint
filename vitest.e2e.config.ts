import { defineConfig } from 'vitest/config';

/**
 * Runs the napi end-to-end spec on its own; the module JSDoc of
 * `packages/@markuplint/core/e2e.spec.ts` says why it is kept out of
 * `vitest.config.ts` and where this config is used.
 */
export default defineConfig({
	test: {
		include: ['./packages/@markuplint/core/e2e.spec.ts'],
		testTimeout: 10000,
	},
});
