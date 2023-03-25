import type { Config, PlainData, RuleConfigValue } from '@markuplint/ml-config';
import type { MLRule } from '@markuplint/ml-core';

import { lint } from './lint';

/**
 * @deprecated
 * @param options
 * @returns
 */
export async function lint_v1(options: {
	/**
	 * Glob pattern
	 */
	readonly files?: string | readonly string[];

	/**
	 * Target source code of evaluation
	 */
	readonly sourceCodes?: string | readonly string[];

	/**
	 * File names when `sourceCodes`
	 */
	readonly names?: string | readonly string[];

	/**
	 * Workspace path when `sourceCodes`
	 */
	readonly workspace?: string;

	/**
	 * Configure file or object
	 */
	readonly config?: string | Config;

	/**
	 * The config applied when not resolved from files or set it explicitly.
	 */
	readonly defaultConfig?: Config;

	/**
	 * Rules (default: `@markuplint/rules`)
	 */
	readonly rules?: readonly Readonly<MLRule<RuleConfigValue, PlainData>>[];

	/**
	 * Auto resolve rules
	 *
	 * Auto importing form *node_modules* when set `@markuplint/rule-{RULE_NAME}` or `markuplint-rule-{RULE_NAME}` in config rules
	 */
	readonly rulesAutoResolve?: boolean;

	/**
	 * Auto fix
	 */
	readonly fix?: boolean;

	/**
	 * Locale
	 */
	readonly locale?: string;
}) {
	const filePathList = options.files ? (Array.isArray(options.files) ? options.files : [options.files]) : [];
	const codes = options.sourceCodes
		? Array.isArray(options.sourceCodes)
			? options.sourceCodes
			: [options.sourceCodes]
		: [];

	const files = [
		...filePathList,
		...codes.map((code, i) => ({
			sourceCode: code,
			name: Array.isArray(options.names) ? options.names?.[i] : options.names,
			workspace: options.workspace?.[i],
		})),
	];

	let config: Config | undefined;
	let configFile: string | undefined;
	if (typeof options.config === 'string') {
		configFile = options.config;
	} else if (options.config) {
		config = options.config;
	}

	const result = await lint(files, {
		config,
		configFile,
		noSearchConfig: !options.files,
		rules: options.rules,
		autoLoad: options.rulesAutoResolve ?? true,
		locale: options.locale,
	});

	return result;
}
