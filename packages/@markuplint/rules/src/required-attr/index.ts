import { Result, createRule } from '@markuplint/ml-core';

type RequiredAttributes = string | string[];

export default createRule<RequiredAttributes, null>({
	name: 'required-attr',
	defaultLevel: 'warning',
	defaultValue: [],
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			const requiredAttrs = typeof node.rule.value === 'string' ? [node.rule.value] : node.rule.value;
			requiredAttrs.forEach(attr => {
				if (!node.hasAttribute(attr)) {
					const message = messages('Required {0} on {1}', `'${attr}'`, `'<${node.nodeName}>'`);
					reports.push({
						severity: node.rule.severity,
						message,
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
				}
			});
		});

		return reports;
	},
});
