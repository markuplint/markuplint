import { createRule } from '@markuplint/ml-core';

export default createRule<string[], null>({
	defaultValue: [],
	defaultOptions: null,
	async verify({ document, report, t, globalRule }) {
		for (const query of globalRule.value) {
			const exists = document.matchNodes(query);
			if (exists.length === 0) {
				const message = t('Require {0}', t('the "{0*}" {1}', query, 'element'));
				report({
					message,
					line: 1,
					col: 1,
					raw: document.nodeList[0].raw.slice(0, 1),
				});
			}
		}

		await document.walkOn('Element', el => {
			if (el.rule.value === globalRule.value) {
				return;
			}
			for (const query of el.rule.value) {
				const exists = el.children.find(child => child.matches(query));
				if (!exists) {
					const message = t('Require {0}', t('the "{0*}" {1}', query, 'element'));
					report({
						scope: el,
						message,
					});
				}
			}
		});
	},
});
