import { createRule } from '@markuplint/ml-core';

export default createRule<string[], null>({
	defaultValue: [],
	defaultOptions: null,
	async verify({ document, report, t, globalRule }) {
		for (const query of globalRule.value) {
			const elements = document.matchNodes(query);
			for (const el of elements) {
				const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
				report({
					scope: el,
					message,
				});
			}
		}

		await document.walkOn('Element', el => {
			if (el.rule.value === globalRule.value) {
				return;
			}
			for (const query of el.rule.value) {
				const elements = el.querySelectorAll(query);
				for (const el of elements) {
					const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
					report({
						scope: el,
						message,
					});
				}
			}
		});
	},
});
