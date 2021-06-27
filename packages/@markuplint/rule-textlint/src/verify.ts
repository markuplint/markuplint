import { Option, lintText } from './helper';
import { Config } from 'textlint/lib/src/config/config';
import { MLRuleOptions } from '@markuplint/ml-core';
import { TextLintEngine } from 'textlint';
import { TextlintResult } from '@textlint/kernel';

import path from 'path';

const lintEngineCache = new Map<string, TextLintEngine>();

export const defaultOptions = true;

export const textlintVerify: (
	...args: Parameters<MLRuleOptions<boolean, Option>['verify']>
) => Promise<TextlintResult | undefined> = async (document, translate, config) => {
	const html = document.toString();
	const option = config.option;

	if (typeof option === 'object') {
		return await lintText(html, option);
	}

	if (option === true) {
		const dirname = document.filename && path.dirname(document.filename);
		const cacheKey = dirname || '';

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
