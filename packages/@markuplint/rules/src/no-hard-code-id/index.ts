import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that disallows hard-coded `id` attribute values in document fragments.
 *
 * Only active for fragment documents (e.g., component templates). Reports
 * any `id` attribute whose value is a static string rather than a dynamic
 * or code-generated value, encouraging dynamic ID generation to avoid
 * collisions when fragments are reused.
 */
export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		if (!document.isFragment) {
			return;
		}
		await document.walkOn('Attr', attr => {
			if (attr.name.toLowerCase() === 'id' && !attr.isDynamicValue && attr.valueType !== 'code') {
				report({
					scope: attr,
					line: attr.startLine,
					col: attr.startCol,
					raw: attr.raw,
					message: t('It is {0:c}', 'hard-coded'),
				});
			}
		});
	},
});
