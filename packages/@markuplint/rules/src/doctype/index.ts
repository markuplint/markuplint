import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

type Value = 'always';
type Option = {
	denyObsoleteType: boolean;
};

export default createRule<Value, Option>({
	meta: meta,
	defaultValue: 'always',
	defaultOptions: {
		denyObsoleteType: true,
	},
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		const doctype = document.doctype;

		if (!doctype) {
			report({
				message: t('Require {0}', 'doctype'),
				line: 1,
				col: 1,
				raw: '',
			});
			return;
		}

		if ((doctype.name.toLowerCase() === 'html' && doctype.publicId) || doctype.systemId) {
			report({
				scope: doctype,
				message: t('Never {0} {1}', 'declare', 'obsolete doctype'),
			});
		}
	},
});
