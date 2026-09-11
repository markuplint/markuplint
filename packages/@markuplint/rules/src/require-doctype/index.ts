import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/** The rule value; currently only `'always'` is supported, requiring a doctype. */
type Value = 'always';

export default createRule<Value>({
	meta: meta,
	defaultValue: 'always',
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		if (!document.doctype) {
			report({
				message: t('Require {0}', 'doctype'),
				line: 1,
				col: 1,
				raw: '',
			});
		}
	},
});
