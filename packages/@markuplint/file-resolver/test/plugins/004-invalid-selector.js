import { createPlugin } from '@markuplint/ml-core';

export default createPlugin({
	name: 'invalid-selector',
	create() {
		return {
			rules: {},
			configs: {
				'node-rules': {
					nodeRules: [{ selector: 'span[', rules: { 'require-attr': 'title' } }],
				},
			},
		};
	},
});
