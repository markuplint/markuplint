import { Config, RuleConfigValue } from '@markuplint/ml-config';
import { MLResultInfo } from './types';
import { MLRule } from '@markuplint/ml-core';
import { lintFile } from './lint-file';
import { resolveConfigs } from './resolve-configs';
import { resolveLintTargetFiles } from './resolve-lint-target-files';
import { resolveRules } from './resolve-rules';

export async function lint(options: {
	/**
	 * Glob pattern
	 */
	files?: string | string[];

	/**
	 * Target source code of evaluation
	 */
	sourceCodes?: string | string[];

	/**
	 * File names when `sourceCodes`
	 */
	names?: string | string[];

	/**
	 * Workspace path when `sourceCodes`
	 */
	workspace?: string;

	/**
	 * Configure file or object
	 */
	config?: string | Config;

	/**
	 * The config applied when not resolved from files or set it explicitly.
	 */
	defaultConfig?: Config;

	/**
	 * Rules (default: `@markuplint/rules`)
	 */
	rules?: MLRule<RuleConfigValue, unknown>[];

	/**
	 * Auto resolve rules
	 *
	 * Auto importing form *node_modules* when set `@markuplint/rule-{RULE_NAME}` or `markuplint-rule-{RULE_NAME}` in config rules
	 */
	rulesAutoResolve?: boolean;

	/**
	 * Auto fix
	 */
	fix?: boolean;

	/**
	 * Locale
	 */
	locale?: string;
}) {
	const rulesAutoResolve = options.rulesAutoResolve ?? true;

	const files = await resolveLintTargetFiles(options);
	const configs = await resolveConfigs(files, options);
	const rules = await resolveRules(options);

	const totalResults: MLResultInfo[] = [];

	for (const file of files) {
		const result = await lintFile(file, configs, rulesAutoResolve, rules, options.locale, options.fix);
		totalResults.push(result);
	}

	return totalResults;
}
