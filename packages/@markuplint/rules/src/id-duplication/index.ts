import { createRule } from '@markuplint/ml-core';

export default createRule({
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
				if (
					idAttr.attrType === 'ps-attr' ||
					(idAttr.attrType === 'html-attr' && idAttr.isDynamicValue) ||
					(idAttr.attrType === 'html-attr' && idAttr.isDirective)
				) {
					continue;
				}
				const id = idAttr.getValue();
				if (idStack.includes(id.raw)) {
					report({
						scope: node,
						message,
						line: idAttr.startLine,
						col: idAttr.startCol,
						raw: idAttr.raw,
					});
				}
				idStack.push(id.raw);
			}
		});
	},
});
