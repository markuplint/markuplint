import { Result, createRule } from '@markuplint/ml-core';
import { getAttrSpecs } from '../helpers';

export default createRule({
	name: 'deprecated-attr',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		await document.walkOn('Element', async element => {
			const attrSpecs = getAttrSpecs(element.nodeName, document.specs);

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
					const message = translate(
						'The {0} {1} is {2}',
						name.potential,
						'attribute',
						attrSpec.obsolete ? 'obsolete' : 'deprecated',
					);
					reports.push({
						severity: element.rule.severity,
						message,
						line: name.line,
						col: name.col,
						raw: name.raw,
					});
				}
			}
		});
		return reports;
	},
});
