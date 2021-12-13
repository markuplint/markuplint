// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPlugin, createRule } = require('@markuplint/ml-core');

module.exports = createPlugin({
	name: 'foo',
	create(settings) {
		return {
			rules: {
				bar: createRule({
					defaultValue: 'bar-value',
					defaultOptions: null,
					verify({ report }) {
						report({
							message: `It's test: ${settings && settings.foo}`,
							line: 0,
							col: 0,
							raw: '',
						});
					},
				}),
			},
		};
	},
});
