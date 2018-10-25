import { createRule, Result } from '@markuplint/ml-core';

export default createRule({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages(`{0} is {1}`, 'Element', 'deprecated');
		await document.walkOn('Element', async node => {
			if (node.obsolete) {
				reports.push({
					severity: node.rule.severity,
					message,
					line: node.startLine,
					col: node.startCol + 1,
					raw: node.nodeName,
				});
			}
		});
		return reports;
	},
});
