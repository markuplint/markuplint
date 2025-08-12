import type { ConfigSet } from '@markuplint/file-resolver';
import type { LocaleSet } from '@markuplint/i18n';
import type { Config, SeverityOptions, Violation } from '@markuplint/ml-config';
import type { AnyMLRule, MLSchema, Ruleset } from '@markuplint/ml-core';

export type APIOptions = {
	readonly configFile?: string;
	readonly config?: Config;
	readonly defaultConfig?: Config;
	readonly noSearchConfig?: boolean;
	readonly locale?: string;
	readonly fix?: boolean;
	readonly ignoreExt?: boolean;
	readonly rules?: readonly Readonly<AnyMLRule>[];
	readonly importPresetRules?: boolean;
	readonly severity?: SeverityOptions;
	readonly maxViolations?: number;
	/**
	 * @deprecated
	 */
	readonly autoLoad?: boolean;
};

export type MLEngineEventMap = {
	log: [phase: string, message: string];
	config: [filePath: string, config: ConfigSet, message?: string];
	exclude: [filePath: string, setting: string, message?: string];
	parser: [filePath: string, parser: string, message?: string];
	ruleset: [filePath: string, ruleset: Ruleset, message?: string];
	schemas: [filePath: string, schemas: MLSchema, message?: string];
	rules: [filePath: string, rules: readonly Readonly<AnyMLRule>[], message?: string];
	i18n: [filePath: string, locale: LocaleSet, message?: string];
	code: [filePath: string, sourceCode: string, message?: string];
	lint: [
		filePath: string,
		sourceCode: string,
		violations: readonly Violation[],
		fixedCode: string,
		debug: readonly string[] | null,
		message?: string,
	];
	'lint-error': [filePath: string, sourceCode: string, error: Readonly<Error>];
	'config-errors': [filePath: string, errors: readonly Readonly<Error>[]];
};
