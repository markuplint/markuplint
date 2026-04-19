import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'./packages/**/*.spec.{js,mjs,ts}',
			'./vscode/src/**/*.spec.{js,mjs,ts}',
			'./vscode/scripts/**/*.spec.{js,mjs,ts}',
		],
		testTimeout: 10000,
	},
});
