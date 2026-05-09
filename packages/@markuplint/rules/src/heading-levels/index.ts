import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Rule that validates heading levels (h1-h6) are not skipped.
 *
 * Ensures that heading elements appear in a sequential order without
 * gaps (e.g., an h4 must not follow an h2 directly without an h3 in between).
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultOptions: null,
	verify({ document, report, t }) {
		const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
		let prevLevel: number | null = null;
		for (const heading of headings) {
			const level = Number.parseInt(heading.nodeName.slice(1));

			if (prevLevel !== null && prevLevel + 1 < level) {
				report({
					scope: heading,
					message: t('{0} must not be skipped', t('Heading levels')),
				});
			}
			prevLevel = level;
		}
	},
});
