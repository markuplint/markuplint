import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const elSpec = document.specs.specs.find(s => s.name === el.localName);
			const descendantOf = elSpec?.contentModel?.descendantOf;
			if (!descendantOf) {
				return;
			}
			let ancestor = el.parentElement;
			let found = false;
			while (ancestor) {
				if (ancestor.matches(descendantOf)) {
					found = true;
					break;
				}
				ancestor = ancestor.parentElement;
			}
			if (!found) {
				report({
					scope: el,
					message: t(
						'{0} must appear as a descendant of {1}',
						t('the "{0}" {1}', el.localName, 'element'),
						t('the "{0}" {1}', descendantOf, 'element'),
					),
				});
			}
		});
	},
});
