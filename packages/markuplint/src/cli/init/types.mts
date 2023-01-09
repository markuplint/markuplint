export type Langs =
	| 'jsx'
	| 'vue'
	| 'svelte'
	| 'astro'
	| 'pug'
	| 'php'
	| 'smarty'
	| 'erb'
	| 'ejs'
	| 'mustache'
	| 'nunjucks'
	| 'liquid';

export type Category = 'validation' | 'a11y' | 'naming-convention' | 'style' | 'maintainability';

export type RuleSettingMode =
	// Customize
	| Category[]
	// Otherwise
	| 'recommended'
	| 'none';

export type DefaultRules = Record<string, Rule>;

export type Rule = {
	category: Category;
	defaultValue: boolean | string | number;
};
