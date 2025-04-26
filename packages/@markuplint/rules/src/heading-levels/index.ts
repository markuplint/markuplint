import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	verify({ document, report, t }) {
		const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
		let prevLevel = 1;
		for (const heading of headings) {
			const level = Number.parseInt(heading.nodeName.slice(1));

			if (prevLevel + 1 < level) {
				report({
					scope: heading,
					message: t('{0} must not be skipped', t('Heading levels')),
				});
			}
			prevLevel = level;
		}
	},
});
