import { createRule } from '@markuplint/ml-core';

export default createRule<boolean, null>({
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// Element
		await document.walkOn('Element', el => {
			const raw = el.raw.trim();
			if (/./i.test(raw)) {
				report({
					scope: el,
					message: t('It is {0}', 'issue'),
				});
			}
		});

		// Attribute
		await document.walkOn('Attr', attr => {
			if (/./i.test(attr.name)) {
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
