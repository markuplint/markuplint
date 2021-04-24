import { Result, createRule } from '@markuplint/ml-core';
import { attrSpecs, getSpec } from '../helpers';
import { ElementVerifyWalkerFactory } from '../types';
import { MLMLSpec } from '@markuplint/ml-spec';

const verifyWalker: ElementVerifyWalkerFactory<null, null, MLMLSpec> = (reports, translate, spec) => node => {
	const specs = attrSpecs(node.nodeName, spec);

	if (!specs) {
		return;
	}

	for (const attr of node.attributes) {
		const name = attr.getName();
		const attrSpec = specs.find(item => item.name === name.potential);
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
				severity: node.rule.severity,
				message,
				line: name.line,
				col: name.col,
				raw: name.raw,
			});
		}
	}
};

export default createRule({
	name: 'deprecated-attr',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		const spec = getSpec(document.schemas);
		await document.walkOn('Element', verifyWalker(reports, translate, spec));
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		const spec = getSpec(document.schemas);
		document.walkOnSync('Element', verifyWalker(reports, translate, spec));
		return reports;
	},
});
