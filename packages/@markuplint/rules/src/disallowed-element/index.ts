import { createRule } from '@markuplint/ml-core';

export default createRule<string[]>({
	defaultValue: [],
	verify({ document, report, t }) {
		for (const query of document.rule.value) {
			const elements = document.querySelectorAll(query);
			elements.forEach(el => {
				const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
				report({
					scope: el,
					message,
				});
			});
		}

		void document.walkOn('Element', el => {
			if (el.rule.value === document.rule.value) {
				return;
			}
			for (const query of el.rule.value) {
				const elements = el.querySelectorAll(query);
				elements.forEach(el => {
					const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
					report({
						scope: el,
						message,
					});
				});
			}
		});
	},
});
