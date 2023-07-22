import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./packages/markuplint/**/*.spec.ts', './packages/@markuplint/esm-adapter/test/*.spec.js'],
		testTimeout: 10000,
	},
});
