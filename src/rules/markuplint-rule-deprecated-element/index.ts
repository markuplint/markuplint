import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export default CustomRule.create({
	name: 'deprecated-element',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, `{0} is {1}`, 'Element', 'deprecated');
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			if (node.obsolete) {
				reports.push({
					level: node.rule.level,
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
