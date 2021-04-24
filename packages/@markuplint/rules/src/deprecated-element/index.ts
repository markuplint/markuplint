import { Result, createRule } from '@markuplint/ml-core';
import { ElementVerifyWalkerFactory } from '../types';
import { getSpecByTagName } from '@markuplint/ml-spec';
import specs from '@markuplint/html-spec';

const verifyWalker: ElementVerifyWalkerFactory = (reports, translate) => element => {
	if (element.isForeignElement) {
		return;
	}
	const spec = getSpecByTagName(element.nodeName, specs);
	if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
		reports.push({
			severity: element.rule.severity,
			message: translate('{0} is {1}', 'Element', 'deprecated'),
			line: element.startLine,
			col: element.startCol,
			raw: element.raw,
		});
	}
};

export default createRule({
	name: 'deprecated-element',
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
