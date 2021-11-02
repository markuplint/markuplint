import { createRule } from '@markuplint/ml-core';

export default createRule({
	name: 'attr-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(context) {
		const message = context.translate('Duplicate {0}', 'attribute name');
		await context.document.walkOn('Element', async node => {
			const attrNameStack: string[] = [];
			for (const attr of node.attributes) {
				if (attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.getName();
				const name = node.isCustomElement ? attrName.potential : attrName.potential.toLowerCase();
				if (attrNameStack.includes(name)) {
					context.report({
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
