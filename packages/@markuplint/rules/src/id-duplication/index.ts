import { Result, createRule } from '@markuplint/ml-core';

export default createRule({
	name: 'id-duplication',
	defaultValue: null,
	defaultOptions: null,
	verify(document, translate) {
		const reports: Result[] = [];
		const message = translate('Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];

		document.walkOn('Element', node => {
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
					reports.push({
						severity: node.rule.severity,
						message,
						line: idAttr.startLine,
						col: idAttr.startCol,
						raw: idAttr.raw,
					});
				}
				idStack.push(id.raw);
			}
		});

		return reports;
	},
});
