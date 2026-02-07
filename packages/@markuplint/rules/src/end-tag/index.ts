import { createRule } from '@markuplint/ml-core';
import { isVoidElement } from '@markuplint/ml-spec';

import meta from './meta.js';

/**
 * Rule that checks for missing end tags on non-void HTML elements.
 *
 * Reports elements that are neither void nor self-closing and have no
 * closing tag. Omitted elements and elements in documents configured
 * with `endTag: 'never'` are excluded.
 */
export default createRule<boolean>({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		if (document.endTag === 'never') {
			return;
		}
		await document.walkOn('Element', el => {
			if (el.isOmitted) {
				return;
			}
			if (isVoidElement(el)) {
				return;
			}
			if (el.closeTag != null) {
				return;
			}
			if ((document.endTag === 'xml' || el.isForeignElement) && el.selfClosingSolidus?.raw) {
				return;
			}

			report({
				scope: el,
				message: t('Missing {0}', t('the {0}', 'end tag')),
			});
		});
	},
});
