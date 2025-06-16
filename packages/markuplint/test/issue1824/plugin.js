import { createPlugin, createRule } from '@markuplint/ml-core';

const myRule = () =>
	createRule({
		verify({ document, report }) {
			const el = document.querySelector('div');
			if (el) {
				report({
					message: 'The div element is found',
					scope: el,
				});
			}
		},
	});

export default createPlugin({
	create(setting) {
		return {
			rules: {
				'my-rule': myRule(setting),
			},
		};
	},
	name: 'my-plugin',
});
