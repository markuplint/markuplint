import type { Option } from './helper';
import type { RuleSeed } from '@markuplint/ml-core';
import type { TextlintResult } from '@textlint/kernel';

import { lintText } from './helper';

export const defaultOptions = {};

export const textlintVerify: (
	...args: Parameters<RuleSeed<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = async context => {
	const html = context.document.toString();
	const options = context.document.rule.options;

	if (typeof options === 'object') {
		return await lintText(html, options);
	}

	if (options === true) {
		// eslint-disable-next-line no-console
		console.error(
			'`config.option` with `true` value is only available on Node.js, please use plain `TextlintKernelOptions` instead',
		);
	}
};
