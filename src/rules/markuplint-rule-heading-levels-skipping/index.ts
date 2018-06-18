import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export default CustomRule.create({
	name: 'name',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages('error');
		await document.walkOn('Node', async node => {
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
