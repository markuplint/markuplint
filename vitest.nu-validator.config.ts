import { defineConfig } from 'vitest/config';

import { nodeBareSpecifierResolution } from './scripts/vitest-node-resolution.ts';

export default defineConfig({
	plugins: [nodeBareSpecifierResolution()],
	test: {
		include: ['./tests/external/spec/**/*.spec.ts'],
		testTimeout: 120_000,
	},
});
