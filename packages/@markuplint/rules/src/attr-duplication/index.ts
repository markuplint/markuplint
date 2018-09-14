import { createRule, Result } from '@markuplint/ml-core';

export default createRule({
	name: 'attr-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages('Duplicate {0}', 'attribute name');
		await document.walkOn('Element', async node => {
			const attrNameStack: string[] = [];
			for (const attr of node.attributes) {
				const attrName = attr.name.raw.toLowerCase();
				if (attrNameStack.includes(attrName)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attr.startLine,
						col: attr.startCol,
						raw: attr.raw,
					});
				} else {
					attrNameStack.push(attrName);
				}
			}
		});
		return reports;
	},
});
