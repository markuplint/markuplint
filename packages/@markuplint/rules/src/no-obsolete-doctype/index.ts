import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * HTML LS §13.1.1: the "force-quirks flag" doctype-parsing algorithm has no
 * exception for this string, but §the-initial-insertion-mode / the DOCTYPE
 * grammar explicitly permits `<!DOCTYPE html SYSTEM "about:legacy-compat">`
 * as the one conforming legacy-string doctype, used to keep a document
 * shareable with old parsers that require a system identifier.
 */
const LEGACY_COMPAT_SYSTEM_ID = 'about:legacy-compat';

export default createRule({
	meta: meta,
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		const doctype = document.doctype;

		if (!doctype) {
			return;
		}

		if (!doctype.publicId && doctype.systemId === LEGACY_COMPAT_SYSTEM_ID) {
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
