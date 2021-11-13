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
		};
	},
});
