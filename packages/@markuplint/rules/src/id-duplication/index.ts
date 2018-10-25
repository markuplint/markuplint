import { createRule, Result } from '@markuplint/ml-core';

export default createRule({
	name: 'id-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages('Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];
		await document.walkOn('Element', async node => {
			const idAttr = node.getAttributeToken('id');
			if (!idAttr || !idAttr.value) {
				return;
			}
			const id = idAttr.value.raw;
			if (idStack.includes(id)) {
				reports.push({
					severity: node.rule.severity,
					message,
					line: idAttr.startLine,
					col: idAttr.startCol,
					raw: idAttr.raw,
				});
			}
			idStack.push(id);
		});
		return reports;
	},
});
