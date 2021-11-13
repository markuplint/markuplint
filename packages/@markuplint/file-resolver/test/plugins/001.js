// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPlugin } = require('@markuplint/ml-core');

module.exports = createPlugin({
	name: 'foo',
	create(settings) {
		return {
			rules: {
				bar: {
					verify: async () => [],
				},
			},
			configs: {
				'bar-config': {
					key: '001.js',
					key2: '001-2.js',
					rules: {
						xxx: 'yyy',
						zzz: {
							severity: 'error',
						},
					},
				},
			},
		};
	},
});
