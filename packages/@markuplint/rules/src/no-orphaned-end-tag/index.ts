import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<boolean, null>({
	meta,
	async verify({ document, report, t }) {
		await document.walkOn('Text', text => {
			const raw = text.raw.trim();
			if (/^<\//.test(raw)) {
				report({
					scope: text,
					message: t('{0} detected', t('Orphaned end tag')),
				});
			}
		});
	},
});
