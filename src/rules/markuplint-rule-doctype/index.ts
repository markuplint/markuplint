import Doctype from '../../dom/doctype';
import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export type DoctypeValue = 'always' | 'never';

export default CustomRule.create<DoctypeValue, null>({
	name: 'doctype',
	defaultValue: 'always',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: VerifyReturn[] = [];
		const message = messages('error');
		let has = false;
		if (document.globalRule && !document.isFragment) {
			await document.walkOn('Node', async node => {
				if (node instanceof Doctype) {
					has = true;
				}
			});
			if (document.globalRule.value === 'never') {
				has = !has;
			}
			if (!has) {
				reports.push({
					severity: document.globalRule.severity,
					level: document.globalRule.severity,
					message,
					line: 1,
					col: 1,
					raw: '',
				});
			}
		}
		return reports;
	},
});
