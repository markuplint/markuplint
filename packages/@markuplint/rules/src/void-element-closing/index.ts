import { Result, createRule } from '@markuplint/ml-core';

export default createRule({
	name: 'name',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const message = messages('error');
		await document.walkOn('Element', async node => {
			// eslint-disable-next-line no-constant-condition
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
