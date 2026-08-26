import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	// Deprecation data is sourced from MDN/BCD (factual, not a spec MUST/MUST
	// NOT), unlike `no-obsolete-attr`'s HTML LS non-conforming-features list.
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpecs) {
				return;
			}

			const name = attr.name;
			const attrSpec = attrSpecs.find(item => item.name === name);
			if (!attrSpec) {
				return;
			}
			if (attrSpec.deprecated) {
				report({
					scope: attr,
					line: attr.nameNode?.startLine,
					col: attr.nameNode?.startCol,
					raw: attr.nameNode?.raw,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'deprecated'),
				});
			}
		});
	},
});
