import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		const message = t(
			'{0} is {1:c}',
			t('{0} of {1}', t('the {0}', 'value'), t('the "{0*}" {1}', 'id', 'attribute')),
			'duplicated',
		);
		const idStack: string[] = [];
		await document.walkOn('Element', node => {
			const idAttrs = node.getAttributeToken('id');
			for (const idAttr of idAttrs) {
				if (idAttr.isDynamicValue || idAttr.isDirective) {
					continue;
				}
				const id = idAttr.value;
				if (idStack.includes(id)) {
					report({
						scope: node,
						message,
						line: idAttr.startLine,
						col: idAttr.startCol,
						raw: idAttr.raw,
					});
				}
				idStack.push(id);
			}
		});
	},
});
