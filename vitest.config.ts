import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./packages/**/*.spec.{js,mjs,ts}'],
		exclude: ['./packages/@markuplint/core/e2e.spec.ts'],
		testTimeout: 10000,
	},
});
