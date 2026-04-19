import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./src/**/*.spec.ts', './scripts/**/*.spec.mjs'],
		testTimeout: 10_000,
	},
});
