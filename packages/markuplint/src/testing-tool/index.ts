import type { Target } from '@markuplint/file-resolver';
import type { Config } from '@markuplint/ml-config';
import type { AnyMLRule } from '@markuplint/ml-core';

import { lint } from '../api';
import { getGlobal } from '../global-settings';

export async function mlTest(sourceCode: string, config: Config, rules?: AnyMLRule[], locale?: string, fix = false) {
	const global = getGlobal();
	const results = await lint([{ sourceCode }], {
		config,
		rules,
		locale: locale ?? global.locale,
		fix,
		autoLoad: true,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? sourceCode,
	};
}

export async function mlTestFile(target: Target, config?: Config, rules?: AnyMLRule[], locale?: string, fix = false) {
	const global = getGlobal();
	const results = await lint([target], {
		config,
		rules,
		locale: locale ?? global.locale,
		fix,
		noSearchConfig: !!config,
		autoLoad: true,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? result?.sourceCode,
	};
}
