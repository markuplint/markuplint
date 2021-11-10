import type { Option } from './helper';
import type { MLRuleOptions } from '@markuplint/ml-core';
import type { TextlintResult } from '@textlint/kernel';

import { lintText } from './helper';

export const defaultOptions = {};

export const textlintVerify: (
	...args: Parameters<MLRuleOptions<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = async context => {
	const html = context.document.toString();
	const option = context.globalRule.option;

	if (typeof option === 'object') {
		return await lintText(html, option);
	}

	if (option === true) {
		// eslint-disable-next-line no-console
		console.error(
			'`config.option` with `true` value is only available on Node.js, please use plain `TextlintKernelOptions` instead',
		);
	}
};
