import { createRule } from '@markuplint/ml-core';

export default createRule({
	defaultValue: null,
	defaultOptions: null,
	async verify({ document, report, t }) {
		const message = t('{0} is {1:c}', t('the {0}', 'attribute name'), 'duplicated');
		await document.walkOn('Element', async node => {
			const attrNameStack: string[] = [];
			for (const attr of node.attributes) {
				if (attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.getName();
				const name = node.isCustomElement ? attrName.potential : attrName.potential.toLowerCase();
				if (attrNameStack.includes(name)) {
					report({
						scope: node,
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
	},
});
