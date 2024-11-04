import { createRule } from '@markuplint/ml-core';
import { isVoidElement } from '@markuplint/ml-spec';

import meta from './meta.js';

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
			if ((document.endTag === 'xml' || el.isForeignElement) && el.raw.trimEnd().endsWith('/>')) {
				return;
			}

			report({
				scope: el,
				message: t('Missing {0}', t('the {0}', 'end tag')),
			});
		});
	},
});
