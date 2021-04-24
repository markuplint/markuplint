import { Result, createRule } from '@markuplint/ml-core';
import { ElementVerifyWalkerFactory } from '../types';

const verifyWalker: ElementVerifyWalkerFactory<null, null, [string[]]> = (reports, translate, idStack) => node => {
	const idAttrs = node.getAttributeToken('id');
	for (const idAttr of idAttrs) {
		if (
			idAttr.attrType === 'ps-attr' ||
			(idAttr.attrType === 'html-attr' && idAttr.isDynamicValue) ||
			(idAttr.attrType === 'html-attr' && idAttr.isDirective)
		) {
			continue;
		}
		const id = idAttr.getValue();
		if (idStack.includes(id.raw)) {
			reports.push({
				severity: node.rule.severity,
				message: translate('Duplicate {0}', 'attribute id value'),
				line: idAttr.startLine,
				col: idAttr.startCol,
				raw: idAttr.raw,
			});
		}
		idStack.push(id.raw);
	}
};

export default createRule({
	name: 'id-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		const idStack: string[] = [];
		await document.walkOn('Element', verifyWalker(reports, translate, idStack));
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		const idStack: string[] = [];
		document.walkOnSync('Element', verifyWalker(reports, translate, idStack));
		return reports;
	},
});
