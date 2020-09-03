import { Result, createRule } from '@markuplint/ml-core';
import { attrMatches, attrSpecs, getSpec } from '../helpers';

type RequiredAttributes = string | string[];

export default createRule<RequiredAttributes, null>({
	name: 'required-attr',
	defaultLevel: 'error',
	defaultValue: [],
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		const spec = getSpec(document.schemas);
		await document.walkOn('Element', async node => {
			const customRequiredAttrs = typeof node.rule.value === 'string' ? [node.rule.value] : node.rule.value;

			const attributeSpecs = attrSpecs(node.nodeName, spec).map(attr => {
				const required = customRequiredAttrs.includes(attr.name);
				if (required) {
					return {
						...attr,
						required: true,
					};
				}
				return attr;
			});

			for (const spec of attributeSpecs) {
				const didntHave = !node.hasAttribute(spec.name);

				let invalid = false;

				if (spec.requiredEither) {
					const candidate = [...spec.requiredEither, spec.name];
					invalid = !candidate.some(attrName => node.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(node, spec.condition) && didntHave;
				} else if (spec.required) {
					if (spec.required.ancestor) {
						const ancestors = spec.required.ancestor.split(',').map(a => a.trim());
						invalid = ancestors.some(a => node.closest(a)) && didntHave;
					}
				}

				if (invalid) {
					const message = translate('Required {0} on {1}', `'${spec.name}'`, `'<${node.nodeName}>'`);
					reports.push({
						severity: node.rule.severity,
						message,
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
				}
			}
		});

		return reports;
	},
});
