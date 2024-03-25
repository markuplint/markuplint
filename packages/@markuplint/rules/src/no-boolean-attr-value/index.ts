import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);
			if (!attrSpec) {
				return;
			}

			if (attr.isDynamicValue) {
				return;
			}

			const name = attr.name;

			const spec = attrSpec.find(s => s.name === name);
			if (!spec) {
				return;
			}

			if (spec.type !== 'Boolean') {
				return;
			}

			const extraTokens = [
				attr.spacesBeforeEqual,
				attr.equal,
				attr.spacesAfterEqual,
				attr.startQuote,
				attr.valueNode,
				attr.endQuote,
			];

			const extraRaw = extraTokens.reduce((raw, t) => raw + (t?.raw ?? ''), '');

			if (extraRaw) {
				report({
					scope: attr,
					line: attr.spacesBeforeEqual?.startLine,
					col: attr.spacesBeforeEqual?.startCol,
					raw: extraRaw,
					message:
						t('{0} is {1}', t('the "{0*}" {1}', name, 'attribute'), t('a {0}', 'boolean attribute')) +
						t('. ') +
						t("It doesn't need {0}", t('the {0}', 'value')),
				});
			}
		});
	},
});
