import { createRule } from '@markuplint/ml-core';

export default createRule({
	defaultServerity: 'warning',
	verify({ document, report, t }) {
		if (!document.isFragment) {
			return;
		}
		document.walkOn('Element', el => {
			for (const attr of el.attributes) {
				if (
					attr.potentialName.toLowerCase() === 'id' &&
					((attr.attrType === 'html-attr' && !attr.isDynamicValue) ||
						(attr.attrType === 'ps-attr' && attr.valueType !== 'code'))
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
