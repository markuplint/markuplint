import { Result, createRule } from '@markuplint/ml-core';

import { Option } from './helper';
import { textlintVerify } from './verify';

const isNode = typeof process !== 'undefined' && !!process?.versions?.node;

export default createRule<boolean, Option>({
	defaultLevel: 'warning',
	name: 'textlint',
	defaultValue: true,
	defaultOptions: isNode || {},
	async verify(document, translate, config) {
		const reports: Result[] = [];
		const html = document.toString();
		const textlintResult = await textlintVerify(document, translate, config);

		if (!textlintResult) {
			return reports;
		}

		for (const result of textlintResult.messages) {
			const message = translate(`Invalid text: ${result.message}`);
			const [s, e] = result.fix?.range || [result.index, result.index];
			const raw = html.slice(s, e) || '';
			reports.push({
				severity: config.severity,
				message,
				line: result.line,
				col: result.column,
				raw,
			});
		}
		return reports;
	},
});
