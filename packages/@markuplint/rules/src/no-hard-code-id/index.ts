import { createRule } from '@markuplint/ml-core';

export default createRule<boolean, null>({
	defaultServerity: 'warning',
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		if (!document.isFragment) {
			return;
		}
		document.walkOn('Element', el => {
			for (const attr of el.attributes) {
				if (
					(attr.attrType === 'html-attr' && !attr.isDynamicValue) ||
					(attr.attrType === 'ps-attr' &&
						attr.potentialName.toLowerCase() === 'id' &&
						attr.valueType !== 'code')
				) {
					report({
						scope: el,
						line: attr.startLine,
						col: attr.startCol,
						raw: attr.raw,
						message: t('It is {0:c}', 'hard-coded'),
					});
				}
			}
		});
	},
});
