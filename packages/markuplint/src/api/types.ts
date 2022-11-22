import type { ConfigSet } from '@markuplint/file-resolver';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLMarkupLanguageParser, ParserOptions } from '@markuplint/ml-ast';
import type { Config, Pretender, Violation } from '@markuplint/ml-config';
import type { AnyMLRule, MLSchema, Ruleset } from '@markuplint/ml-core';

export type APIOptions = {
	configFile?: string;
	config?: Config;
	defaultConfig?: Config;
	noSearchConfig?: boolean;
	locale?: string;
	fix?: boolean;
	ignoreExt?: boolean;
	rules?: AnyMLRule[];
	importPresetRules?: boolean;
	/**
	 * @deprecated
	 */
	autoLoad?: boolean;
};

export type MLFabric = {
	ruleset: Ruleset;
	rules: AnyMLRule[];
	schemas: MLSchema;
	parser: MLMarkupLanguageParser;
	parserOptions: ParserOptions;
	pretenders: Pretender[];
	locale: LocaleSet;
	configErrors?: Error[];
};

export type MLEngineEventMap = {
	log: (phase: string, message: string) => void;
	config: (filePath: string, config: ConfigSet, message?: string) => void;
	exclude: (filePath: string, setting: string, message?: string) => void;
	parser: (filePath: string, parser: string, message?: string) => void;
	ruleset: (filePath: string, ruleset: Ruleset, message?: string) => void;
	schemas: (filePath: string, schemas: MLSchema, message?: string) => void;
	rules: (filePath: string, rules: AnyMLRule[], message?: string) => void;
	i18n: (filePath: string, locale: LocaleSet, message?: string) => void;
	code: (filePath: string, sourceCode: string, message?: string) => void;
	lint: (
		filePath: string,
		sourceCode: string,
		violations: Violation[],
		fixedCode: string,
		debug: string[] | null,
		message?: string,
	) => void;
	'lint-error': (filePath: string, sourceCode: string, error: Error) => void;
	'config-errors': (filePath: string, errors: Error[]) => void;
};
