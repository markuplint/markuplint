import { createPlugin, createRule } from '@markuplint/ml-core';

export default createPlugin({
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
							raw: '<!-- code -->',
						});
					},
				}),
			},
		};
	},
});
