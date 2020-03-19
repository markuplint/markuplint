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
				const attrName = attr.name.raw.toLowerCase();
				if (attrNameStack.includes(attrName)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attr.name.startLine,
						col: attr.name.startCol,
						raw: attr.raw.trim(),
					});
				} else {
					attrNameStack.push(attrName);
				}
			}
		});
		return reports;
	},
});
