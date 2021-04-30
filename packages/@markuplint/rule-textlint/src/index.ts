import { Result, createRule } from '@markuplint/ml-core';
import { TextlintKernel, TextlintResult } from '@textlint/kernel';
import { Config } from 'textlint/lib/config/config';
import { TextLintEngine } from 'textlint';
import { TextlintKernelOptions } from '@textlint/kernel/lib/textlint-kernel-interface';

// @ts-ignore / This has no types
import TextlintPluginHTML from 'textlint-plugin-html';

import path from 'path';

const kernel = new TextlintKernel();

type Option = Partial<TextlintKernelOptions> | true;

export default createRule<boolean, Option>({
	defaultLevel: 'warning',
	name: 'textlint',
	defaultValue: true,
	defaultOptions: true,
	async verify(document, translate, config) {
		const reports: Result[] = [];
		const html = document.toString();
		const option = config.option;
		let textlintResult: TextlintResult;
		if (typeof option === 'object') {
			textlintResult = await kernel.lintText(html, {
				...option,
				ext: '.html',
				plugins: [
					...((config.option as TextlintKernelOptions).plugins || []),
					{
						pluginId: 'html',
						plugin: TextlintPluginHTML,
					},
				],
			});
		} else {
			if (option === true) {
				const textlintConfig = Config.initWithAutoLoading({
					cwd: document.filename && path.dirname(document.filename),
				});
				if (!textlintConfig.plugins.includes('html')) {
					textlintConfig.plugins.push('html');
					textlintConfig.pluginsConfig.html = true;
				}
				const lintEngine = new TextLintEngine(textlintConfig);
				textlintResult = (await lintEngine.executeOnText(html, '.html'))[0];
			} else {
				// eslint-disable-next-line no-console
				console.warn('`config.option` should be `true` or `object`');
				return reports;
			}
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
