import type { Option } from './helper';

import { createRule } from '@markuplint/ml-core';

import { defaultOptions, textlintVerify } from './verify';

export default createRule<boolean, Option>({
	defaultSeverity: 'warning',
	defaultValue: true,
	defaultOptions,
	async verify(context) {
		const textlintResult = await textlintVerify(context);

		if (!textlintResult) {
			return;
		}

		const html = context.document.toString();
		for (const result of textlintResult.messages) {
			const message = context.translate(`Invalid text: ${result.message}`);
			const [s, e] = result.fix?.range || [result.index, result.index];
			const raw = html.slice(s, e) || '';
			context.report({
				message,
				line: result.line,
				col: result.column,
				raw,
			});
		}
	},
});
