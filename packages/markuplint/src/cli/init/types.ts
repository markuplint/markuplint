import type { RuleConfigValue } from '@markuplint/ml-config';

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

export type Category =
	| 'syntax'
	| 'structure'
	| 'attributes'
	| 'references'
	| 'forms'
	| 'a11y'
	| 'style'
	| 'maintainability'
	| 'compat';

export type RuleSettingMode =
	// Customize
	| readonly Category[]
	// Otherwise
	| 'recommended'
	| 'none';

export type DefaultRules = Readonly<Record<string, Rule>>;

export type Rule = {
	readonly category: Category;
	readonly defaultValue: RuleConfigValue;
};
