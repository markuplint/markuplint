import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const elSpec = document.specs.specs.find(s => s.name === el.localName);
			const uniqueAttrs = elSpec?.contentModel?.uniqueAttrs;
			if (!uniqueAttrs || uniqueAttrs.length === 0) {
				return;
			}
			for (const attrName of uniqueAttrs) {
				if (!el.hasAttribute(attrName)) {
					continue;
				}
				const parent = el.parentElement;
				if (!parent) {
					continue;
				}
				// Only report on the second (and subsequent) element that has the attribute
				const precedingSiblings = [...parent.children];
				const elIndex = precedingSiblings.indexOf(el);
				const hasPrecedingDuplicate = precedingSiblings
					.slice(0, elIndex)
					.some(child => child.localName === el.localName && child.hasAttribute(attrName));
				if (hasPrecedingDuplicate) {
					report({
						scope: el,
						message: t(
							'The "{0}" attribute must not appear on more than one "{1}" element within the same parent',
							attrName,
							el.localName,
						),
					});
				}
			}
		});
	},
});
