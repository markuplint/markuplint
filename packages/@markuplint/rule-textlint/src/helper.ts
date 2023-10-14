import type { TextlintKernelOptions } from '@textlint/kernel';

import { TextlintKernel } from '@textlint/kernel';
import TextlintPluginHTML from 'textlint-plugin-html';

export type Option = Partial<TextlintKernelOptions> | true;

const kernel = new TextlintKernel();

export const lintText = async (
	html: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	option: Partial<TextlintKernelOptions>,
) => {
	return await kernel.lintText(html, {
		...option,
		ext: '.html',
		plugins: [
			...(option.plugins ?? []),
			{
				pluginId: 'html',
				plugin: TextlintPluginHTML,
			},
		],
	});
};
