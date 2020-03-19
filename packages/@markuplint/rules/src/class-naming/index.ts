import { Result, createRule } from '@markuplint/ml-core';

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
				for (const className of node.classList) {
					if (!classPatterns.some(pattern => match(className, pattern))) {
						const attr = node.getAttributeToken('class');
						if (!attr) {
							continue;
						}
						reports.push({
							severity: node.rule.severity,
							message: messages(
								'{0} {1} is unmatched patterns ({2})',
								`"${className}"`,
								'class name',
								`"${classPatterns.join('", "')}"`,
							),
							line: attr.name.startLine,
							col: attr.name.startCol,
							raw: attr.raw.trim(),
						});
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
