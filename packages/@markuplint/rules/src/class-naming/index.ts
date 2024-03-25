import { createRule } from '@markuplint/ml-core';
import { toNoEmptyStringArrayFromStringOrArray } from '@markuplint/shared';

import { match } from '../helpers.js';

import meta from './meta.js';

export type Value = string | string[] | null;

export default createRule<Value>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const classPatterns = toNoEmptyStringArrayFromStringOrArray(el.rule.value).filter(
				className => className && typeof className === 'string',
			);
			const attrs = el.getAttributeToken('class');
			for (const attr of attrs) {
				if (attr.isDynamicValue) {
					continue;
				}
				const classAttr = attr.valueNode;
				const classList = attr.value
					.split(/\s+/)
					.map(c => c.trim())
					.filter(Boolean);
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
