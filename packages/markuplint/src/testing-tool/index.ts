import { AnyMLRule } from '@markuplint/ml-core';
import { Config } from '@markuplint/ml-config';
import { api } from '../api';

export async function test(html: string, config: Config, rules: AnyMLRule[], locale?: string, fix = false) {
	const results = await api([{ sourceCode: html }], {
		config,
		rules,
		locale,
		fix,
		autoLoad: true,
		importPresetRules: false,
	});
	const result = results[0];

	return {
		violations: result?.results ?? [],
		fixedCode: result?.fixedCode ?? html,
	};
}
