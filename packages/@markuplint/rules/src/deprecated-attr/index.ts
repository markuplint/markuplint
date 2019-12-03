import { Result, createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';
import specs from '@markuplint/html-ls';

export default createRule({
	name: 'deprecated-attr',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const message = messages('error');
		await document.walkOn('Element', async element => {
			const spec = getSpecByTagName(element.nodeName, specs);
			console.log(spec);
			for (const attr of element.attributes) {
				console.log(attr.name.raw);
			}
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
