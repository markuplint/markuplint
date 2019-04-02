import { Doctype, Result, createRule } from '@markuplint/ml-core';

export type Value = 'always' | 'never';

export default createRule<Value>({
	name: 'doctype',
	defaultValue: 'always',
	defaultOptions: null,
	async verify(document, messages, rule) {
		const reports: Result[] = [];
		const message = messages('error');
		let has = false;

		if (!document.isFragment) {
			await document.walk(async node => {
				if (node instanceof Doctype) {
					has = true;
				}
			});
			if (rule.value === 'never') {
				has = !has;
			}
			if (!has) {
				reports.push({
					severity: rule.severity,
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
