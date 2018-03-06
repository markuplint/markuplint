import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export default CustomRule.create({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages(`{0} is {1}`, 'Element', 'deprecated');
		await document.walkOn('Element', async (node) => {
			if (node.obsolete) {
				reports.push({
					severity: node.rule.severity,
					message,
					line: node.line,
					col: node.col + 1,
					raw: node.nodeName,
				});
			}
		});
		return reports;
	},
});
