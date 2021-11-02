import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import type { AnyMLRule } from './ml-rule';
import type { I18n } from '@markuplint/i18n';
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { ParserOptions } from '@markuplint/ml-config';
import type Ruleset from './ruleset';

export type MLSchema = Readonly<[MLMLSpec, ...ExtendedSpec[]]>;

export type MLFabric = {
	parser: MLMarkupLanguageParser;
	ruleset: Partial<Ruleset>;
	rules: AnyMLRule[];
	i18n: I18n;
	schemas: MLSchema;
	parserOptions: ParserOptions;
};
