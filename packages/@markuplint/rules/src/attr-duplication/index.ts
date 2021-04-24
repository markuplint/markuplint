import { Result, createRule } from '@markuplint/ml-core';
import { ElementVerifyWalkerFactory } from '../types';

const verifyWalker: ElementVerifyWalkerFactory = (reports, translate) => node => {
	const attrNameStack: string[] = [];
	for (const attr of node.attributes) {
		if (attr.attrType === 'ps-attr' && attr.isDuplicatable) {
			continue;
		}
		const attrName = attr.getName();
		if (attrNameStack.includes(attrName.raw.toLowerCase())) {
			reports.push({
				severity: node.rule.severity,
				message: translate('Duplicate {0}', 'attribute name'),
				line: attrName.line,
				col: attrName.col,
				raw: attrName.raw,
			});
		} else {
			attrNameStack.push(attrName.raw.toLowerCase());
		}
	}
};

export default createRule({
	name: 'attr-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		await document.walkOn('Element', verifyWalker(reports, translate));
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		document.walkOnSync('Element', verifyWalker(reports, translate));
		return reports;
	},
});
