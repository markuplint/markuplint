import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export default createRule({
	verify({ document, report, t }) {
		void document.walkOn('Attr', attr => {
			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpecs) {
				return;
			}

			const name = attr.name;
			const attrSpec = attrSpecs.find(item => item.name === name);
			if (!attrSpec) {
				return;
			}
			if (attrSpec.deprecated || attrSpec.obsolete) {
				const message = t(
					'{0} is {1:c}',
					t('the "{0*}" {1}', name, 'attribute'),
					attrSpec.obsolete ? 'obsolete' : 'deprecated',
				);
				report({
					scope: attr,
					line: attr.nameNode?.startLine,
					col: attr.nameNode?.startCol,
					raw: attr.nameNode?.raw,
					message,
				});
			}
		});
	},
});
