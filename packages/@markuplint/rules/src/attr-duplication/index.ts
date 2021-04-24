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
				if (attrNameStack.includes(attrName.raw.toLowerCase())) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attrName.line,
						col: attrName.col,
						raw: attrName.raw,
					});
				} else {
					attrNameStack.push(attrName.raw.toLowerCase());
				}
			}
		});
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		const message = translate('Duplicate {0}', 'attribute name');
		document.walkOnSync('Element', node => {
			const attrNameStack: string[] = [];
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr' && attr.isDuplicatable) {
					continue;
				}
				const attrName = attr.getName();
				if (attrNameStack.includes(attrName.raw.toLowerCase())) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attrName.line,
						col: attrName.col,
						raw: attrName.raw,
					});
				} else {
					attrNameStack.push(attrName.raw.toLowerCase());
				}
			}
		});
		return reports;
	},
});
