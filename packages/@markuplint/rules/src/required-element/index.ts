import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

type Options = {
	ignoreHasMutableContents: boolean;
};

export default createRule<string[], Options>({
	meta: meta,
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableContents: true,
	},
	async verify({ document, report, t }) {
		const hasMutableContent = document.nodeList.some(n => n.is(n.ELEMENT_NODE) && n.hasMutableChildren());
		if (!hasMutableContent) {
			for (const query of document.rule.value) {
				const exists = document.querySelectorAll(query);
				if (exists.length === 0) {
					const message = t('Require {0}', t('the "{0*}" {1}', query, 'element'));
					report({
						message,
						line: 1,
						col: 1,
						raw: document.nodeList[0]?.raw.slice(0, 1) ?? '',
					});
				}
			}
		}

		await document.walkOn('Element', el => {
			if (el.rule.value === document.rule.value) {
				return;
			}
			if (el.rule.options.ignoreHasMutableContents && el.hasMutableChildren()) {
				return;
			}
			for (const query of el.rule.value) {
				const exists = [...el.children].find(child => child.matches(query));
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
