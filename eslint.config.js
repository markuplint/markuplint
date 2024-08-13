import { config } from '@markuplint-dev/eslint-config';

export default [
	...config,
	{
		ignores: ['**/*.d.ts', '**/lib/*', '**/esm/*', '**/cjs/*'],
	},
];
