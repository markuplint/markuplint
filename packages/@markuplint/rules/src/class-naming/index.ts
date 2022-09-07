import { createRule } from '@markuplint/ml-core';

import { match } from '../helpers';

export type Value = string | string[] | null;

export default createRule<Value>({
	defaultServerity: 'warning',
	defaultValue: null,
	verify({ document, report, t }) {
		document.walkOn('Element', node => {
			if (!node.rule.value) {
				return;
			}
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
						report({
							scope: node,
							message: t(
								'{0} is unmatched with the below patterns: {1}',
								t('the "{0*}" {1}', className, 'class name'),
								`"${classPatterns.join('", "')}"`,
							),
							line: classAttr.line,
							col: classAttr.col,
							raw: classAttr.raw,
						});
					}
				}
			}
		});
	},
});
