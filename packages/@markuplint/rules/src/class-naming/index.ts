import { createRule } from '@markuplint/ml-core';
import { toNoEmptyStringArrayFromStringOrArray } from '@markuplint/shared';

import { match } from '../helpers.js';

import meta from './meta.js';

/** One or more regex or glob patterns that class names must match, or `null` to disable. */
export type Value = string | string[] | null;

/**
 * Rule that validates class attribute values against configured naming patterns.
 *
 * Splits the `class` attribute into individual class names and checks each
 * one against the provided string or regex patterns. Reports any class name
 * that does not match at least one of the configured patterns. Dynamic
 * values are excluded from the check.
 */
export default createRule<Value>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const classPatterns = toNoEmptyStringArrayFromStringOrArray(el.rule.value).filter(
				className => !!className && typeof className === 'string',
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
