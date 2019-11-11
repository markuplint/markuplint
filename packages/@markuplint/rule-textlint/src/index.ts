import { Result, createRule } from '@markuplint/ml-core';
import { TextlintKernel } from '@textlint/kernel';

// @ts-ignore / This has not types
import TextlintPluginHTML from 'textlint-plugin-html';

const kernel = new TextlintKernel();

type Option = Partial<Parameters<TextlintKernel['lintText']>[1] & {}>;

export default createRule<boolean, Option>({
	defaultLevel: 'warning',
	name: 'textlint',
	defaultValue: true,
	defaultOptions: {},
	async verify(document, messages, config) {
		const reports: Result[] = [];
		const html = document.toString();
		const option = config.option;
		const textlintResult = await kernel.lintText(html, {
			...option,
			ext: '.html',
			plugins: [
				...(config.option.plugins || []),
				{
					pluginId: 'html',
					plugin: TextlintPluginHTML,
				},
			],
		});
		for (const result of textlintResult.messages) {
			const message = messages(`Invalid text: ${result.message}`);
			reports.push({
				severity: config.severity,
				message,
				line: result.line,
				col: result.column,
				raw: '',
			});
		}
		return reports;
	},
});
