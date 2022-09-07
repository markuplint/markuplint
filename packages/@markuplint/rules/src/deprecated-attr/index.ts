import { createRule, getAttrSpecs } from '@markuplint/ml-core';

export default createRule({
	verify({ document, report, t }) {
		document.walkOn('Element', element => {
			const attrSpecs = getAttrSpecs(element.nameWithNS, document.specs);

			if (!attrSpecs) {
				return;
			}

			for (const attr of element.attributes) {
				const name = attr.getName();
				const attrSpec = attrSpecs.find(item => item.name === name.potential);
				if (!attrSpec) {
					return;
				}
				if (attrSpec.deprecated || attrSpec.obsolete) {
					const message = t(
						'{0} is {1:c}',
						t('the "{0*}" {1}', name.potential, 'attribute'),
						attrSpec.obsolete ? 'obsolete' : 'deprecated',
					);
					report({
						scope: element,
						message,
						line: name.line,
						col: name.col,
						raw: name.raw,
					});
				}
			}
		});
	},
});
