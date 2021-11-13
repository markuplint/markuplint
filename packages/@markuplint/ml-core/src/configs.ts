import type { Config } from '@markuplint/ml-config';

export const configs: Record<string, Config> = {
	recommended: require('../markuplint-recommended.json'),

	// For test
	___test: {
		// @ts-ignore
		___configs: 'test',
	},
};
