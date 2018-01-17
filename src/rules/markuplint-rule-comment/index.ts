import {
	CustomRule,
	VerifyReturn,
} from '../../rule';
import messages from '../messages';

export default CustomRule.create({
	name: 'name',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, 'error');
		await document.walkOn('Node', async (node) => {
			if (!node.rule) {
				return;
			}
			if (true) {
				// reports.push({
				// 	level: node.rule.level,
				// 	message,
				// 	line: node.line,
				// 	col: node.col,
				// 	raw: node.raw,
				// });
			}
		});
		return reports;
	},
});
