import { Option, lintText } from './helper';
import { MLRuleOptions } from '@markuplint/ml-core';
import { TextlintResult } from '@textlint/kernel';

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
