import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<string[]>({
	meta: meta,
	defaultValue: [],
	async verify({ document, report, t }) {
		// A restricted element is restricted wherever it is: the content of a `template` element and a
		// declarative shadow root are searched as well
		for (const query of document.rule.value) {
			const elements = document.deepQuerySelectorAll(query);
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
				const elements = el.deepQuerySelectorAll(query);
				for (const found of elements) {
					const message = t('{0} is disallowed', t('the "{0*}" {1}', query, 'element'));
					report({
						// `scope` resolves the rule's `reason`/`reasonOnly` (the node-level rule
						// setting is mapped to `el`, not to `found`), so it must stay `el`.
						// Location comes from `line`/`col`/`raw`, which take precedence over the scope's.
						scope: el,
						line: found.startLine,
						col: found.startCol,
						raw: found.raw,
						message,
					});
				}
			}
		});
	},
});
