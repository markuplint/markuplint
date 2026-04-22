import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['./tests/external/spec/**/*.spec.ts'],
		testTimeout: 30_000,
	},
});
