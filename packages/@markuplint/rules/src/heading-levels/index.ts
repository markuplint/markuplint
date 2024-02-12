import { createRule } from '@markuplint/ml-core';

export default createRule<boolean, null>({
	meta: {
		category: 'validation',
	},
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
					message: t('Heading levels should not be skipped'),
				});
			}
			prevLevel = level;
		}
	},
});
