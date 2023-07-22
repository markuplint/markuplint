import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./packages/markuplint/**/*.spec.ts'],
		testTimeout: 10000,
	},
});
