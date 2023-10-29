import type { Option } from './helper.js';
import type { RuleSeed } from '@markuplint/ml-core';
import type { TextlintResult } from '@textlint/kernel';

import { lintText } from './helper.js';

export const defaultOptions = true;

export const textlintVerify: (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...args: Parameters<RuleSeed<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = ({ document }) => {
	const html = document.toString();
	const options = document.rule.options;

	return lintText(html, typeof options === 'boolean' ? {} : options);
};
