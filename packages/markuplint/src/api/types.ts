import type { ConfigSet } from '@markuplint/file-resolver';
import type { LocaleSet } from '@markuplint/i18n';
import type { Config, Violation } from '@markuplint/ml-config';
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
	/**
	 * @deprecated
	 */
	readonly autoLoad?: boolean;
};

export type MLEngineEventMap = {
	log: (phase: string, message: string) => void;
	config: (
		filePath: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		config: ConfigSet,
		message?: string,
	) => void;
	exclude: (filePath: string, setting: string, message?: string) => void;
	parser: (filePath: string, parser: string, message?: string) => void;
	ruleset: (filePath: string, ruleset: Ruleset, message?: string) => void;
	schemas: (filePath: string, schemas: MLSchema, message?: string) => void;
	rules: (filePath: string, rules: readonly Readonly<AnyMLRule>[], message?: string) => void;
	i18n: (filePath: string, locale: LocaleSet, message?: string) => void;
	code: (filePath: string, sourceCode: string, message?: string) => void;
	lint: (
		filePath: string,
		sourceCode: string,
		violations: readonly Violation[],
		fixedCode: string,
		debug: readonly string[] | null,
		message?: string,
	) => void;
	'lint-error': (filePath: string, sourceCode: string, error: Readonly<Error>) => void;
	'config-errors': (filePath: string, errors: readonly Readonly<Error>[]) => void;
};
