import type { AnyMLRule } from './ml-rule/index.js';
import type { Ruleset } from './ruleset/index.js';
import type { LocaleSet } from '@markuplint/i18n';
import type { MLParser, ParserOptions } from '@markuplint/ml-ast';
import type { Pretender, RuleAliasWarning, RuleCommonSettings, SeverityOptions } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

/**
 * A tuple of the base HTML/ARIA specification and zero or more
 * framework-specific extended specs (e.g. React, Vue, Svelte).
 */
export type MLSchema = readonly [MLMLSpec, ...ExtendedSpec[]];

/**
 * The set of dependencies required by {@link MLCore} to perform linting.
 * Includes the parser, ruleset, rules, locale, schemas, and other settings.
 */
export type MLFabric = {
	readonly parser: Readonly<MLParser>;
	readonly ruleset: Partial<Readonly<Ruleset>>;
	readonly rules: readonly Readonly<AnyMLRule>[];
	readonly locale: LocaleSet;
	readonly schemas: MLSchema;
	readonly ruleCommonSettings: RuleCommonSettings;
	readonly parserOptions: ParserOptions;
	readonly severity: SeverityOptions;
	readonly pretenders: readonly Pretender[];
	readonly configErrors?: readonly Readonly<Error>[];
	/**
	 * Deprecated-rule-name notices found while applying the rule-alias table
	 * (v5 rule-system redesign, #3989). Kept structured, separate from
	 * {@link configErrors}, so `MLCore.verify()` can report them under their
	 * own `rule-deprecation` ruleId instead of `config-error`.
	 */
	readonly ruleDeprecations?: readonly RuleAliasWarning[];
};
