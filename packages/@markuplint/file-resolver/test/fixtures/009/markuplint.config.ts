import type { Config } from '@markuplint/ml-config';

const config: Config = {
	extends: ['markuplint:recommended'],
	rules: {
		foo: false,
	},
};

// eslint-disable-next-line import/no-default-export
export default config;
