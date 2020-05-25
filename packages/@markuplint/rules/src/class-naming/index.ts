import { Result, createRule } from '@markuplint/ml-core';
import { match } from '../helpers';

export type Value = string | string[] | null;

export default createRule<Value>({
	name: 'class-naming',
	defaultLevel: 'warning',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
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
							message: translate(
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
