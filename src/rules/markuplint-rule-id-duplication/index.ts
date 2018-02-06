import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export default CustomRule.create({
	name: 'id-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		const message = await messages(locale, 'Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const id = node.id;
			if (id && id.value) {
				if (idStack.includes(id.value)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: id.location.line,
						col: id.location.col,
						raw: id.raw,
					});
				}
				idStack.push(id.value);
			}
		});
		return reports;
	},
});
