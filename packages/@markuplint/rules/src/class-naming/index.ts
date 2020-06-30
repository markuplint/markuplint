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
				const attrs = node.getAttributeToken('class');
				for (const attr of attrs) {
					const classAttr = attr.getValue();
					const classList = classAttr.raw
						.split(/\s+/g)
						.map(c => c.trim())
						.filter(c => c);
					for (const className of classList) {
						if (!classPatterns.some(pattern => match(className, pattern))) {
							reports.push({
								severity: node.rule.severity,
								message: translate(
									'{0} {1} is unmatched patterns ({2})',
									`"${className}"`,
									'class name',
									`"${classPatterns.join('", "')}"`,
								),
								line: classAttr.line,
								col: classAttr.col,
								raw: classAttr.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	},
});
