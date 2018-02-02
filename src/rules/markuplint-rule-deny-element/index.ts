import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export default CustomRule.create({
	name: 'deny-element',
	defaultLevel: 'warning',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const message = await messages(locale, '{0} は許可されていません');
			reports.push({
				level: node.rule.level,
				message,
				line: node.line,
				col: node.col,
				raw: node.raw,
			});
		});
		return reports;
	},
});
