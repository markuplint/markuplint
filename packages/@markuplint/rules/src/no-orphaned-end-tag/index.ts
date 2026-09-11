import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<boolean, null>({
	meta,
	async verify({ document, report, t }) {
		await document.walkOn('Text', text => {
			if (text.isBogus) {
				report({
					scope: text,
					message: t('{0} detected', t('Orphaned end tag')),
					fix: fixer => fixer.remove({ startOffset: text.startOffset, raw: text.raw }),
				});
			}
		});
	},
});
