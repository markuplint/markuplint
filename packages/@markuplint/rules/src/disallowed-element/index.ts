import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<string[]>({
	meta: meta,
	defaultValue: [],
	async verify({ document, report, t }) {
		for (const query of document.rule.value) {
			const elements = document.querySelectorAll(query);
			for (const el of elements) {
				const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
				report({
					scope: el,
					message,
				});
			}
		}

		await document.walkOn('Element', el => {
			if (el.rule.value === document.rule.value) {
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
