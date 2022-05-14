import { createRule } from '@markuplint/ml-core';

import { match } from '../helpers';

export type Value = string | string[] | null;

export default createRule<Value>({
	defaultServerity: 'warning',
	defaultValue: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!el.rule.value) {
				return;
			}
			const classPatterns = Array.isArray(el.rule.value) ? el.rule.value : [el.rule.value];
			const attrs = el.getAttributeToken('class');
			for (const attr of attrs) {
				if (attr.isDynamicValue) {
					continue;
				}
				const classAttr = attr.valueNode;
				const classList = attr.value
					.split(/\s+/g)
					.map(c => c.trim())
					.filter(c => c);
				for (const className of classList) {
					if (!classPatterns.some(pattern => match(className, pattern))) {
						report({
							scope: attr,
							message: t(
								'{0} is unmatched with the below patterns: {1}',
								t('the "{0*}" {1}', className, 'class name'),
								`"${classPatterns.join('", "')}"`,
							),
							line: classAttr?.startLine,
							col: classAttr?.startCol,
							raw: classAttr?.raw,
						});
					}
				}
			}
		});
	},
});
