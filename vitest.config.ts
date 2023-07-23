import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'./packages/markuplint/**/*.spec.ts',
			'./packages/@markuplint/esm-adapter/test/*.spec.js',
			'./packages/@markuplint/rule-textlint/**/*.spec.ts',
			'./packages/@markuplint/rules/**/*.spec.ts',
		],
		testTimeout: 10000,
	},
});
