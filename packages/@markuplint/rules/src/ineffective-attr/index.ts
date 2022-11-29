import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export default createRule({
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);
			if (!attrSpec) {
				return;
			}

			const name = attr.name;

			const spec = attrSpec.find(s => s.name === name);
			if (!spec) {
				return;
			}

			const ineffectiveConditions = spec.ineffective
				? Array.isArray(spec.ineffective)
					? spec.ineffective
					: [spec.ineffective]
				: [];

			if (ineffectiveConditions.some(selector => attr.ownerElement.matches(selector))) {
				report({
					scope: attr,
					message:
						t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'ineffective') +
						t('. ') +
						t("It doesn't need {0}", t('the {0}', 'attribute')),
				});
			}
		});
	},
});
