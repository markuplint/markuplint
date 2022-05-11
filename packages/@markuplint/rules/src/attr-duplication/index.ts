import { createRule } from '@markuplint/ml-core';

export default createRule({
	async verify({ document, report, t }) {
		const message = t('{0} is {1:c}', t('the {0}', 'attribute name'), 'duplicated');
		await document.walkOn('Element', async node => {
			const attrNameStack: string[] = [];
			for (const attr of node.getAttributeTokens()) {
				if (attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.name;
				const name = node.isCustomElement ? attrName : attrName.toLowerCase();
				if (attrNameStack.includes(name)) {
					const scope = attr.nameNode || attr;
					report({
						scope: {
							rule: node.rule,
							startLine: scope.startLine,
							startCol: scope.startCol,
							raw: scope.raw,
						},
						message,
					});
				} else {
					attrNameStack.push(name);
				}
			}
		});
	},
});
