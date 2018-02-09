import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export default CustomRule.create({
	name: 'deny-element',
	defaultLevel: 'warning',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const message = messages('{0} は許可されていません');
			reports.push({
				severity: node.rule.severity,
				message,
				line: node.line,
				col: node.col,
				raw: node.raw,
			});
		});
		return reports;
	},
});
