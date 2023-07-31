import type { Option } from './helper.js';
import type { RuleSeed } from '@markuplint/ml-core';
import type { TextlintResult } from '@textlint/kernel';

import path from 'node:path';

import { TextLintEngine } from 'textlint';
import { Config } from 'textlint/lib/src/config/config.js';

import { lintText } from './helper.js';

const lintEngineCache = new Map<string, TextLintEngine>();

export const defaultOptions = true;

export const textlintVerify: (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...args: Parameters<RuleSeed<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = async ({ document }) => {
	const html = document.toString();
	const options = document.rule.options;

	if (typeof options === 'object') {
		return await lintText(html, options);
	}

	if (options === true) {
		const dirname = document.filename && path.dirname(document.filename);
		const cacheKey = dirname ?? '';

		let lintEngine: TextLintEngine;

		if (lintEngineCache.has(cacheKey)) {
			lintEngine = lintEngineCache.get(cacheKey)!;
		} else {
			const textlintConfig = Config.initWithAutoLoading({
				cwd: dirname,
			});

			if (!textlintConfig.plugins.includes('html')) {
				textlintConfig.plugins.push('html');
				textlintConfig.pluginsConfig.html = true;
			}

			lintEngine = new TextLintEngine(textlintConfig);
			lintEngineCache.set(cacheKey, lintEngine);
		}

		return (await lintEngine.executeOnText(html, '.html'))[0];
	}
};
