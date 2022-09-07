import { createRule } from '@markuplint/ml-core';

export default createRule({
	defaultServerity: 'warning',
	verify({ document, report, t }) {
		if (!document.isFragment) {
			return;
		}
		void document.walkOn('Attr', attr => {
			if (attr.name.toLowerCase() === 'id' && !attr.isDynamicValue && attr.valueType !== 'code') {
				report({
					scope: attr,
					line: attr.startLine,
					col: attr.startCol,
					raw: attr.raw,
					message: t('It is {0:c}', 'hard-coded'),
				});
			}
		});
	},
});
