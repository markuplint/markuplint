import { Result, createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';
import specs from '@markuplint/html-spec';

export default createRule({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, translate) {
		const reports: Result[] = [];
		const message = translate('{0} is {1}', 'Element', 'deprecated');
		await document.walkOn('Element', async element => {
			if (element.isForeignElement) {
				return;
			}
			const spec = getSpecByTagName(element.nodeName, specs);
			if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
				reports.push({
					severity: element.rule.severity,
					message,
					line: element.startLine,
					col: element.startCol,
					raw: element.raw,
				});
			}
		});
		return reports;
	},
	verifySync(document, translate) {
		const reports: Result[] = [];
		const message = translate('{0} is {1}', 'Element', 'deprecated');
		document.walkOnSync('Element', element => {
			if (element.isForeignElement) {
				return;
			}
			const spec = getSpecByTagName(element.nodeName, specs);
			if (spec && (spec.obsolete || spec.deprecated || spec.nonStandard)) {
				reports.push({
					severity: element.rule.severity,
					message,
					line: element.startLine,
					col: element.startCol,
					raw: element.raw,
				});
			}
		});
		return reports;
	},
});
