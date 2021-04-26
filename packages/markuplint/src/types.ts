import { Config, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document, MLRule, Ruleset } from '@markuplint/ml-core';

export interface MLOptions {
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
}

export interface MLResultInfo {
	results: VerifiedResult[];
	filePath: string;
	sourceCode: string;
	fixedCode: string;
	document: Document<any, unknown> | null;
	parser: string;
	locale?: string;
	ruleset: Ruleset;
	configSet: {
		config: Config;
		files: string[];
		error: string[];
	};
}
