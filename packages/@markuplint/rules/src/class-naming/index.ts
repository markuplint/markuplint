import { createRule } from '@markuplint/ml-core';
import { match } from '../helpers';

export type Value = string | string[] | null;

export default createRule<Value>({
	name: 'class-naming',
	defaultLevel: 'warning',
	defaultValue: null,
	defaultOptions: null,
	async verify(context) {
		await context.document.walkOn('Element', async node => {
			if (node.rule.value) {
				const classPatterns = Array.isArray(node.rule.value) ? node.rule.value : [node.rule.value];
				const attrs = node.getAttributeToken('class');
				for (const attr of attrs) {
					if (attr.attrType === 'html-attr' && attr.isDynamicValue) {
						continue;
					}
					const classAttr = attr.getValue();
					const classList = classAttr.potential
						.split(/\s+/g)
						.map(c => c.trim())
						.filter(c => c);
					for (const className of classList) {
						if (!classPatterns.some(pattern => match(className, pattern))) {
							context.report({
								scope: node,
								message: context.translate(
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
	},
});
