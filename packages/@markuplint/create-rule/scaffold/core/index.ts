import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// Element
		await document.walkOn('Element', el => {
			const raw = el.raw.trim();
			if (/./.test(raw)) {
				report({
					scope: el,
					message: t('It is {0}', 'issue'),
				});
			}
		});

		// Attribute
		await document.walkOn('Attr', attr => {
			if (/./.test(attr.name)) {
				report({
					scope: attr,
					line: attr.nameNode?.startLine,
					col: attr.nameNode?.startCol,
					raw: attr.nameNode?.raw,
					message: t('It is {0}', 'issue'),
				});
			}
		});
	},
});
