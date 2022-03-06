import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export default createRule({
	defaultServerity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const attrSpec = getAttrSpecs(el.nameWithNS, document.specs);
			if (!attrSpec) {
				return;
			}

			for (const attr of el.attributes) {
				if (attr.attrType === 'ps-attr' || attr.isDynamicValue) {
					continue;
				}

				const name = attr.getName().potential;

				const spec = attrSpec.find(s => s.name === name);
				if (!spec) {
					continue;
				}

				if (spec.type !== 'Boolean') {
					continue;
				}

				const extraTokens = [
					attr.spacesBeforeEqual,
					attr.equal,
					attr.spacesAfterEqual,
					attr.startQuote,
					attr.valueNode,
					attr.endQuote,
				];

				const extraRaw = extraTokens.reduce((raw, t) => raw + t.raw, '');

				if (extraRaw) {
					report({
						scope: el,
						raw: extraRaw,
						line: attr.spacesBeforeEqual.startLine,
						col: attr.spacesBeforeEqual.startCol,
						message:
							t('{0} is {1}', t('the "{0*}" {1}', name, 'attribute'), t('a {0}', 'boolean attribute')) +
							t('. ') +
							t("It doesn't need {0}", t('the {0}', 'value')),
					});
				}
			}
		});
	},
});
