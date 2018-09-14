import { createRule, Result } from '@markuplint/ml-core';

export default createRule({
	name: 'name',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const message = messages('error');
		await document.walkOn('Element', async node => {
			if (true) {
				// reports.push({
				// 	level: node.rule.level,
				// 	message,
				// 	line: node.line,
				// 	col: node.col,
				// 	raw: node.raw,
				// });
			}
		});
		return reports;
	},
});
