import { createRule } from '@markuplint/ml-core';

export default createRule<boolean, null>({
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// Node
		await document.walk(node => {
			const raw = node.raw.trim();
			if (/./i.test(raw)) {
				report({
					scope: node,
					message: t('It is {0}', 'issue'),
				});
			}
		});

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
		await document.walkOn('Element', el => {
			for (const attr of el.attributes) {
				if (attr.attrType !== 'html-attr') {
					continue;
				}
				if (/./i.test(attr.name.raw)) {
					report({
						scope: el,
						line: attr.name.startLine,
						col: attr.name.startCol,
						raw: attr.name.raw,
						message: t('It is {0}', 'issue'),
					});
				}
			}
		});
	},
});
