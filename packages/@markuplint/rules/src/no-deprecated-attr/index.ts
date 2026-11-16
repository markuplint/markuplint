import { createRule, getAttrSpecs } from '@markuplint/ml-core';
import { toNoEmptyStringArrayFromStringOrArray } from '@markuplint/shared';

import { findAttrSpec } from '../helpers.js';

import meta from './meta.js';

export default createRule({
	meta: meta,
	// Deprecation is what a specification calls deprecated or what browser vendors deprecate
	// (BCD): factual, not a spec MUST/MUST NOT, unlike the HTML LS non-conforming
	// features that `no-obsolete-attr` follows.
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpecs) {
				return;
			}

			const name = attr.name;
			const attrSpec = findAttrSpec(attrSpecs, attr);
			if (!attrSpec) {
				return;
			}
			if (
				attrSpec.deprecated ||
				toNoEmptyStringArrayFromStringOrArray(attrSpec.deprecatedWhen).some(selector =>
					attr.ownerElement.matches(selector),
				)
			) {
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
