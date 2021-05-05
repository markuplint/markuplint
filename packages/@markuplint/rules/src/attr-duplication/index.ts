import { Result, createRule } from '@markuplint/ml-core';

export default createRule({
	name: 'attr-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		const message = translate('Duplicate {0}', 'attribute name');
		await document.walkOn('Element', async node => {
			const attrNameStack: string[] = [];
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr' && attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.getName();
				const name = node.isCustomElement ? attrName.potential : attrName.potential.toLowerCase();
				if (attrNameStack.includes(name)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attrName.line,
						col: attrName.col,
						raw: attrName.raw,
					});
				} else {
					attrNameStack.push(name);
				}
			}
		});
		return reports;
	},
});
