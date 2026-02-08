import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that detects orphaned end tags with no matching start tag.
 *
 * Scans text nodes for content that looks like a closing tag (starts with
 * `</`) which indicates a stray end tag that the parser could not match
 * to an opening element.
 */
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
