import { createRule, Doctype, Result } from '@markuplint/ml-core';

export type Value = 'always' | 'never';

export default createRule<Value>({
	name: 'doctype',
	defaultValue: 'always',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
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
