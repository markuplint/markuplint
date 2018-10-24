import { createRule, Result } from '@markuplint/ml-core';

export default createRule({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages('error');
		await document.walkOn('Element', async node => {
			console.log({
				node: node.raw,
				obsolete: node.obsolete,
			});
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
