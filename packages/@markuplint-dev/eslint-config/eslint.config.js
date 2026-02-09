import { config } from '@markuplint-dev/eslint-config';

export default [
	...config,
	{
		rules: {
			'no-restricted-globals': 0,
			'unicorn/prefer-module': 0,
		},
	},
];
