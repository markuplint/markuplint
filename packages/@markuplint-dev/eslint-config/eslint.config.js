import { confing } from '@markuplint-dev/eslint-config';

export default [
	...confing,
	{
		rules: {
			'no-restricted-globals': 0,
			'unicorn/prefer-module': 0,
		},
	},
];
