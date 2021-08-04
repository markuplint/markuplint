import { Config, RuleConfigValue } from '@markuplint/ml-config';
import { MLRule } from '@markuplint/ml-core';
import { api } from '.';

/**
 * @deprecated
 * @param options
 * @returns
 */
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

	/**
	 * Confirm the extension of the target file to the regexp of parser plugins.
	 * It doesn't run the linting if it doesn't match.
	 * If you don't set a parser plugin and the target file is HTML, It confirms the regexp as `/\.html?$/i`.
	 * Default is false.
	 *
	 * @default false
	 */
	extMatch?: boolean;
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

	const result = await api(files, {
		config,
		configFile,
		noSearchConfig: !options.files,
		rules: options.rules,
		autoLoad: options.rulesAutoResolve ?? true,
		extMatch: options.extMatch,
		locale: options.locale,
	});

	return result;
}
