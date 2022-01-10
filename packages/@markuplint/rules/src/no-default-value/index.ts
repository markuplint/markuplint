import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { toNormalizedValue } from '../helpers';

export default createRule({
	defaultServerity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const attrSpec = getAttrSpecs(el.nameWithNS, document.specs);

			if (!attrSpec) {
				return;
			}

			for (const attr of el.attributes) {
				if (attr.attrType !== 'html-attr') {
					continue;
				}

				const spec = attrSpec.find(s => s.name === attr.getName().potential);

				if (!spec) {
					continue;
				}

				if (!spec.defaultValue) {
					continue;
				}

				const normalizedValue = toNormalizedValue(attr.getValue().potential, spec);
				const defaultValue = toNormalizedValue(spec.defaultValue, spec);

				if (defaultValue === normalizedValue) {
					report({
						scope: el,
						line: attr.value.startLine,
						col: attr.value.startCol,
						raw: attr.value.raw,
						message: t('It is {0}', t('the {0}', 'default value')),
					});
				}
			}
		});
	},
});
