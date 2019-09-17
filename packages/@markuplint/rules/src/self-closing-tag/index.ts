import { Result, createRule } from '@markuplint/ml-core';

export default createRule<'always' | 'never'>({
	name: 'self-closing-tag',
	defaultLevel: 'warning',
	defaultValue: 'never',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages('Self closing solidus is needed for void element');
		await document.walkOn('Element', async node => {
			if (node.rule.value === 'never') {
				return;
			}
			if (!node.closeTag && !node.selfClosingSolidus.raw) {
				reports.push({
					severity: node.rule.severity,
					message,
					line: node.startLine,
					col: node.startCol,
					raw: node.raw,
				});
			}
		});
		return reports;
	},
	async fix(document) {
		await document.walkOn('Element', async node => {
			if (node.rule.value === 'never') {
				return;
			}
			if (!node.closeTag && !node.selfClosingSolidus.raw) {
				node.selfClosingSolidus.fix('/');
			}
		});
	},
});
