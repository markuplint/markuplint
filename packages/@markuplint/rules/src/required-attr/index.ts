import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrMatches } from '../helpers';

type RequiredAttributes = string | string[];

export default createRule<RequiredAttributes, null>({
	defaultValue: [],
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', async node => {
			if (node.hasSpreadAttr) {
				return;
			}

			const customRequiredAttrs = typeof node.rule.value === 'string' ? [node.rule.value] : node.rule.value;
			const attrSpec = getAttrSpecs(node.nameWithNS, document.specs);

			const attributeSpecs = attrSpec
				? attrSpec.map(attr => {
						const required = customRequiredAttrs.includes(attr.name);
						if (required) {
							return {
								...attr,
								required: true,
							};
						}
						return attr;
				  })
				: customRequiredAttrs.map(attr => ({
						name: attr,
						required: true,
						requiredEither: undefined,
						condition: undefined,
				  }));

			for (const spec of attributeSpecs) {
				const didntHave = !node.hasAttribute(spec.name);

				let invalid = false;

				if (spec.requiredEither) {
					const candidate = [...spec.requiredEither, spec.name];
					invalid = !candidate.some(attrName => node.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(node, spec.condition) && didntHave;
				} else if (spec.required) {
					if ('ancestor' in spec.required && spec.required.ancestor) {
						const ancestorList = Array.isArray(spec.required.ancestor)
							? spec.required.ancestor
							: [spec.required.ancestor];
						const ancestors = ancestorList
							.join(',')
							.split(',')
							.map(a => a.trim());
						invalid = ancestors.some(a => node.closest(a)) && didntHave;
					}
				}

				if (invalid) {
					const message = t(
						'{0} expects {1}',
						t('the "{0}" {1}', spec.name, 'attribute'),
						t('the "{0}" {1}', node.nodeName, 'element'),
					);
					report({
						scope: node,
						message,
					});
				}
			}
		});
	},
});
