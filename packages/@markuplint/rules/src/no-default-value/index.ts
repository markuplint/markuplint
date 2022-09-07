import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { toNormalizedValue } from '../helpers';

export default createRule({
	defaultServerity: 'warning',
	verify({ document, report, t }) {
		void document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpec) {
				return;
			}

			const spec = attrSpec.find(s => s.name === attr.name);

			if (!spec) {
				return;
			}

			if (!spec.defaultValue) {
				return;
			}

			const normalizedValue = toNormalizedValue(attr.value, spec);
			const defaultValue = toNormalizedValue(spec.defaultValue, spec);

			if (defaultValue === normalizedValue) {
				report({
					scope: attr,
					line: attr.valueNode?.startLine,
					col: attr.valueNode?.startCol,
					raw: attr.valueNode?.raw,
					message: t('It is {0}', t('the {0}', 'default value')),
				});
			}
		});
	},
});
