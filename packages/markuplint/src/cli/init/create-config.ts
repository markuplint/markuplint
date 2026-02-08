import type { DefaultRules, Langs, RuleSettingMode } from './types.js';
import type { Config } from '@markuplint/ml-config';
import type { Writable } from 'type-fest';

/**
 * Maps each supported language/framework to a file-extension regular expression
 * used in the generated configuration's `parser` field.
 */
const extRExp: Record<Langs, `\\.${string}$`> = {
	jsx: '\\.[jt]sx?$',
	vue: '\\.vue$',
	svelte: '\\.svelte$',
	sveltekit: '\\.html$',
	astro: '\\.astro$',
	alpine: '\\.html$',
	pug: '\\.pug$',
	php: '\\.php$',
	smarty: '\\.tpl$',
	erb: '\\.erb$',
	ejs: '\\.ejs$',
	mustache: '\\.(mustache|hbs)$',
	nunjucks: '\\.nunjucks$',
	liquid: '\\.liquid$',
};

/**
 * Human-readable display names for each supported template language/framework,
 * shown in the interactive init wizard prompts.
 */
export const langs: Record<Langs, string> = {
	jsx: 'React (JSX)',
	vue: 'Vue',
	svelte: 'Svelte',
	sveltekit: 'SvelteKit',
	astro: 'Astro',
	alpine: 'Alpine.js',
	pug: 'Pug',
	php: 'PHP',
	smarty: 'Smarty',
	erb: 'eRuby',
	ejs: 'EJS',
	mustache: 'Mustache/Handlebars',
	nunjucks: 'Nunjucks',
	liquid: 'liquid (Shopify)',
};

/**
 * Builds a markuplint configuration object based on the user's init wizard selections.
 *
 * Configures parsers and spec modules for the selected template languages,
 * and populates rules based on the chosen rule-setting mode (custom categories,
 * recommended preset, or all defaults).
 *
 * @param langs - The template languages/frameworks selected by the user.
 * @param mode - The rule selection mode: an array of categories, `'recommended'`, or `'none'`.
 * @param defaultRules - The full set of available default rules with their categories and values.
 * @returns A complete markuplint `Config` object ready to be serialized to a file.
 */
export function createConfig(langs: readonly Langs[], mode: RuleSettingMode, defaultRules: DefaultRules): Config {
	let config: Writable<Config> = {};

	const parser: Writable<NonNullable<Config['parser']>> = { ...config.parser };
	for (const lang of langs) {
		const ext = extRExp[lang];
		if (!ext) {
			continue;
		}
		switch (lang) {
			case 'sveltekit': {
				parser[ext] = '@markuplint/svelte-parser/kit';
				break;
			}
			default: {
				parser[ext] = `@markuplint/${lang}-parser`;
			}
		}

		if (lang === 'vue') {
			config = {
				...config,
				specs: {
					...config.specs,
					'\\.vue$': '@markuplint/vue-spec',
				},
			};
		}
		if (lang === 'jsx') {
			config = {
				...config,
				specs: {
					...config.specs,
					'\\.[jt]sx?$': '@markuplint/react-spec',
				},
			};
		}
		if (lang === 'svelte') {
			config = {
				...config,
				specs: {
					...config.specs,
					'\\.svelte$': '@markuplint/svelte-spec',
				},
			};
		}
		if (lang === 'alpine') {
			config = {
				...config,
				specs: {
					...config.specs,
					'\\.html': '@markuplint/alpine-parser/spec',
				},
			};
		}
	}
	if (Object.keys(parser).length > 0) {
		config.parser = parser;
	}

	const rules: Writable<NonNullable<Config['rules']>> = { ...config.rules };
	if (Array.isArray(mode)) {
		const ruleNames = Object.keys(defaultRules);

		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			if (!rule) {
				continue;
			}
			if (mode.includes(rule.category)) {
				rules[ruleName] = rule.defaultValue;
			}
		}
	} else if (mode === 'recommended') {
		config.extends = [...(config.extends ?? []), 'markuplint:recommended'];
	} else {
		const ruleNames = Object.keys(defaultRules);
		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			if (!rule) {
				continue;
			}
			rules[ruleName] = rule.defaultValue;
		}
	}
	if (Object.keys(rules).length > 0) {
		config.rules = rules;
	}

	return config;
}
