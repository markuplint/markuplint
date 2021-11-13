import type { AnyMLRule } from './ml-rule';
import type Ruleset from './ruleset';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { ParserOptions, Config } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

export type MLSchema = Readonly<[MLMLSpec, ...ExtendedSpec[]]>;

export type MLFabric = {
	parser: MLMarkupLanguageParser;
	ruleset: Partial<Ruleset>;
	rules: AnyMLRule[];
	locale: LocaleSet;
	schemas: MLSchema;
	parserOptions: ParserOptions;
};

export type Plugin = {
	name: string;
	rules?: Record<string, AnyMLRule>;
	configs?: Record<string, Config>[];
};
