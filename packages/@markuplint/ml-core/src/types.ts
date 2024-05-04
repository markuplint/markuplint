import type { AnyMLRule } from './ml-rule/index.js';
import type { Ruleset } from './ruleset/index.js';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLParser, ParserOptions } from '@markuplint/ml-ast';
import type { Pretender } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

export type MLSchema = readonly [MLMLSpec, ...ExtendedSpec[]];

export type MLFabric = {
	readonly parser: Readonly<MLParser>;
	readonly ruleset: Partial<Readonly<Ruleset>>;
	readonly rules: readonly Readonly<AnyMLRule>[];
	readonly locale: LocaleSet;
	readonly schemas: MLSchema;
	readonly parserOptions: ParserOptions;
	readonly pretenders: readonly Pretender[];
	readonly configErrors?: readonly Readonly<Error>[];
};
