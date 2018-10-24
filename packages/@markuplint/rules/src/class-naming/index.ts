import { createRule, Result } from '@markuplint/ml-core';

export type Value = string | string[] | null;

export default createRule<Value>({
	name: 'class-naming',
	defaultLevel: 'warning',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		// const message = messages(`{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${config.value}case`);
		await document.walkOn('Element', async node => {
			if (node.rule.value) {
				const classPatterns = Array.isArray(node.rule.value) ? node.rule.value : [node.rule.value];
				for (const classPattern of classPatterns) {
					for (const className of node.classList) {
						if (!match(className, classPattern)) {
							const attr = node.getAttributeToken('class');
							if (!attr) {
								continue;
							}
							reports.push({
								severity: node.rule.severity,
								message: `"${className}" class name is unmatched pattern of "${classPattern}"`,
								line: attr.startLine,
								col: attr.startCol,
								raw: attr.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	},
});

function match(needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}
