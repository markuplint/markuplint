import type { RuleConfigValue } from '@markuplint/ml-config';

/**
 * Identifiers for template engines and frameworks supported by the init wizard.
 */
export type Langs =
	| 'jsx'
	| 'vue'
	| 'svelte'
	| 'sveltekit'
	| 'astro'
	| 'alpine'
	| 'pug'
	| 'php'
	| 'smarty'
	| 'erb'
	| 'ejs'
	| 'mustache'
	| 'nunjucks'
	| 'liquid';

/**
 * Rule categories used to group lint rules during interactive initialization.
 */
export type Category = 'validation' | 'a11y' | 'naming-convention' | 'style' | 'maintainability';

/**
 * Determines how rules are selected during initialization.
 *
 * - An array of {@link Category} values enables per-category customization.
 * - `'recommended'` applies the built-in recommended preset.
 * - `'none'` skips rule configuration entirely.
 */
export type RuleSettingMode =
	// Customize
	| readonly Category[]
	// Otherwise
	| 'recommended'
	| 'none';

/**
 * A mapping from rule names to their metadata, used to populate default rule values.
 */
export type DefaultRules = Readonly<Record<string, Rule>>;

/**
 * Metadata for a single rule as used by the init wizard.
 */
export type Rule = {
	readonly category: Category;
	readonly defaultValue: RuleConfigValue;
};
