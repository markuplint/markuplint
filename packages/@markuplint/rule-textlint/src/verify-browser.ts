import { Option, lintText } from './helper';
import { MLRuleOptions } from '@markuplint/ml-core';
import { TextlintResult } from '@textlint/kernel';

export const defaultOptions = {};

export const textlintVerify: (
	...args: Parameters<MLRuleOptions<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = async (document, translate, config) => {
	const html = document.toString();
	const option = config.option;

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
