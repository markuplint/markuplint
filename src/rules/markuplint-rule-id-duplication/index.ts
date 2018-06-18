import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export default CustomRule.create({
	name: 'id-duplication',
	defaultValue: null,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages('Duplicate {0}', 'attribute id value');
		const idStack: string[] = [];
		await document.walkOn('Element', async node => {
			const id = node.id;
			if (id && id.value) {
				if (idStack.includes(id.value.value)) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: id.location.line,
						col: id.location.col,
						raw: id.raw,
					});
				}
				idStack.push(id.value.value);
			}
		});
		return reports;
	},
});
