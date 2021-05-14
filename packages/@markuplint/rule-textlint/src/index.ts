import { Result, createRule } from '@markuplint/ml-core';
import { TextlintKernel, TextlintResult } from '@textlint/kernel';
import { TextlintKernelOptions } from '@textlint/kernel/lib/textlint-kernel-interface';

// @ts-ignore / This has no types
import TextlintPluginHTML from 'textlint-plugin-html';

type TextLintEngine = import('textlint').TextLintEngine;

type Option = Partial<TextlintKernelOptions> | true;

const isNode = typeof process !== 'undefined' && !!process?.versions?.node;

let path: typeof import('path');
let kernel: TextlintKernel;
let textlint: typeof import('textlint');
let _config: typeof import('textlint/lib/config/config');

const lintEngineCache = new Map<string, TextLintEngine>();

export default createRule<boolean, Option>({
	defaultLevel: 'warning',
	name: 'textlint',
	defaultValue: true,
	defaultOptions: isNode || {},
	async verify(document, translate, config) {
		const reports: Result[] = [];
		const html = document.toString();
		const option = config.option;
		let textlintResult: TextlintResult;
		if (typeof option === 'object') {
			if (!kernel) {
				kernel = new TextlintKernel();
			}

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
		} else if (option === true) {
			if (!isNode) {
				// eslint-disable-next-line no-console
				console.error(
					'`config.option` with `true` value is only available on Node.js, please use plain `TextlintKernelOptions` instead',
				);
				return reports;
			}

			if (!path) {
				path = await import('path');
			}

			if (!textlint) {
				textlint = await import('textlint');
			}

			if (!_config) {
				_config = await import('textlint/lib/config/config');
			}

			const dirname = document.filename && path.dirname(document.filename);
			const cacheKey = dirname || '';

			let lintEngine: TextLintEngine;

			if (lintEngineCache.has(cacheKey)) {
				lintEngine = lintEngineCache.get(cacheKey)!;
			} else {
				const textlintConfig = _config.Config.initWithAutoLoading({
					cwd: dirname,
				});

				if (!textlintConfig.plugins.includes('html')) {
					textlintConfig.plugins.push('html');
					textlintConfig.pluginsConfig.html = true;
				}

				lintEngine = new textlint.TextLintEngine(textlintConfig);
				lintEngineCache.set(cacheKey, lintEngine);
			}

			textlintResult = (await lintEngine.executeOnText(html, '.html'))[0];
		} else {
			// eslint-disable-next-line no-console
			console.warn('`config.option` should be `true` or `object`');
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
