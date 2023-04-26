import type { Config } from '@markuplint/ml-config';

const config: Config = {
	extends: ['markuplint:recommended'],
	rules: {
		foo: false,
	},
};

export default config;
