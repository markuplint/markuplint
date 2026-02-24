import type { ConfigSet } from '@markuplint/file-resolver';
import type { LocaleSet } from '@markuplint/i18n';
import type { Config, SeverityOptions, Violation } from '@markuplint/ml-config';
import type { AnyMLRule, FixSummary, MLSchema, Ruleset } from '@markuplint/ml-core';

/**
 * Options for the markuplint API, controlling configuration, locale, rules, and behavior.
 */
export type APIOptions = {
	readonly configFile?: string;
	readonly config?: Config;
	readonly defaultConfig?: Config;
	readonly noSearchConfig?: boolean;
	readonly locale?: string;
	readonly fix?: boolean;
	/** When true, compute fixes without writing files (CLI dry-run mode). */
	readonly fixDryRun?: boolean;
	readonly ignoreExt?: boolean;
	readonly rules?: readonly Readonly<AnyMLRule>[];
	readonly importPresetRules?: boolean;
	readonly severity?: SeverityOptions;
	/**
	 * @deprecated
	 */
	readonly autoLoad?: boolean;
};

/**
 * Event map for the {@link MLEngine}, defining all emitted events and their payload types.
 */
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
		fixSummary: FixSummary | null,
	];
	'lint-error': [filePath: string, sourceCode: string, error: Readonly<Error>];
	'config-errors': [filePath: string, errors: readonly Readonly<Error>[]];
};
