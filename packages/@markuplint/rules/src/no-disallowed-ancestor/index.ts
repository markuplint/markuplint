import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const elSpec = document.specs.specs.find(s => s.name === el.localName);
			const forbiddenAncestors = elSpec?.contentModel?.forbiddenAncestors;
			if (!forbiddenAncestors || forbiddenAncestors.length === 0) {
				return;
			}
			let ancestor = el.parentElement;
			while (ancestor) {
				if (forbiddenAncestors.some(selector => ancestor!.matches(selector))) {
					report({
						scope: el,
						message: t(
							'{0} must not appear as a descendant of {1}',
							t('the "{0}" {1}', el.localName, 'element'),
							t('the "{0}" {1}', ancestor.localName, 'element'),
						),
					});
					break;
				}
				ancestor = ancestor.parentElement;
			}
		});
	},
});
