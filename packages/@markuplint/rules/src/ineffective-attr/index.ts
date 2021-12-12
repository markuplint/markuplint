import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export default createRule<boolean, null>({
	defaultServerity: 'warning',
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		document.walkOn('Element', el => {
			const attrSpec = getAttrSpecs(el.nameWithNS, document.specs);
			if (!attrSpec) {
				return;
			}

			for (const attr of el.attributes) {
				if (attr.attrType === 'ps-attr') {
					continue;
				}

				const name = attr.getName().potential;

				const spec = attrSpec.find(s => s.name === name);
				if (!spec) {
					continue;
				}

				const ineffectiveConditions = spec.ineffective
					? Array.isArray(spec.ineffective)
						? spec.ineffective
						: [spec.ineffective]
					: [];

				if (ineffectiveConditions.some(selector => el.matches(selector))) {
					report({
						scope: el,
						raw: attr.raw,
						line: attr.startLine,
						col: attr.startCol,
						message:
							t('{0} is {1:c}', t('the "{0}" {1}', name, 'attribute'), 'ineffective') +
							t('. ') +
							t("It doesn't need {0}", t('the {0}', 'attribute')),
					});
				}
			}
		});
	},
});
