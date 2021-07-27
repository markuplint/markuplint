import { TextlintKernel } from '@textlint/kernel';
import { TextlintKernelOptions } from '@textlint/kernel/lib/src/textlint-kernel-interface';

// @ts-ignore / This has no types
import TextlintPluginHTML from 'textlint-plugin-html';

export type Option = Partial<TextlintKernelOptions> | true;

const kernel = new TextlintKernel();

export const lintText = async (html: string, option: Partial<TextlintKernelOptions>) => {
	return await kernel.lintText(html, {
		...option,
		ext: '.html',
		plugins: [
			...(option.plugins || []),
			{
				pluginId: 'html',
				plugin: TextlintPluginHTML,
			},
		],
	});
};
