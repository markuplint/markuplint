import { Result, createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';
import specs from '@markuplint/html-ls';

export default createRule({
	name: 'deprecated-attr',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async element => {
			const spec = getSpecByTagName(element.nodeName, specs);

			if (!spec) {
				return;
			}

			for (const attr of element.attributes) {
				const name = attr.name.raw.toLowerCase();
				const attrSpec = spec.attributes.find(item => item.name === name);
				if (!attrSpec) {
					return;
				}
				if (attrSpec.deprecated || attrSpec.obsolete) {
					const message = messages(
						'The {0} {1} is {2}',
						name,
						'attribute',
						attrSpec.deprecated ? 'deprecated' : 'obsolete',
					);
					reports.push({
						severity: element.rule.severity,
						message,
						line: attr.name.startLine,
						col: attr.name.startCol,
						raw: attr.name.raw,
					});
				}
			}
		});
		return reports;
	},
});
