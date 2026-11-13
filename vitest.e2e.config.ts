import { defineConfig } from 'vitest/config';

import { nodeBareSpecifierResolution } from './scripts/vitest-node-resolution.ts';

/**
 * Runs the napi end-to-end spec on its own; the module JSDoc of
 * `packages/@markuplint/core/e2e.spec.ts` says why it is kept out of
 * `vitest.config.ts` and where this config is used.
 */
export default defineConfig({
	plugins: [nodeBareSpecifierResolution()],
	test: {
		include: ['./packages/@markuplint/core/e2e.spec.ts'],
		testTimeout: 10000,
	},
});
