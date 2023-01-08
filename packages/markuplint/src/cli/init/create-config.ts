import type { DefaultRules, Langs, RuleSettingMode } from './types';
import type { Config } from '@markuplint/ml-config';

import { mergeConfig } from '@markuplint/ml-config';

const extRExp: Record<Langs, `\\.${string}$`> = {
	jsx: '\\.[jt]sx?$',
	vue: '\\.vue$',
	svelte: '\\.svelte$',
	astro: '\\.astro$',
	pug: '\\.pug$',
	php: '\\.php$',
	smarty: '\\.tpl$',
	erb: '\\.erb$',
	ejs: '\\.ejs$',
	mustache: '\\.(mustache|hbs)$',
	nunjucks: '\\.nunjucks$',
	liquid: '\\.liquid$',
};

export const langs: Record<Langs, string> = {
	jsx: 'React (JSX)',
	vue: 'Vue',
	svelte: 'Svelte',
	astro: 'Astro',
	pug: 'Pug',
	php: 'PHP',
	smarty: 'Smarty',
	erb: 'eRuby',
	ejs: 'EJS',
	mustache: 'Mustache/Handlebars',
	nunjucks: 'Nunjucks',
	liquid: 'liquid (Shopify)',
};

export function createConfig(langs: Langs[], mode: RuleSettingMode, defaultRules: DefaultRules) {
	let config: Config = {};

	for (const lang of langs) {
		config.parser = config.parser || {};
		const ext = extRExp[lang];
		if (!ext) {
			continue;
		}
		config.parser[ext] = `@markuplint/${lang}-parser`;

		if (lang === 'vue') {
			config = mergeConfig(config, {
				specs: {
					'\\.vue$': '@markuplint/vue-spec',
				},
			});
		}
		if (lang === 'jsx') {
			config = mergeConfig(config, {
				specs: {
					'\\.[jt]sx?$': '@markuplint/react-spec',
				},
			});
		}
	}

	if (Array.isArray(mode)) {
		const ruleNames = Object.keys(defaultRules);

		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			if (!rule) {
				continue;
			}
			if (mode.includes(rule.category)) {
				if (!config.rules) {
					config.rules = {};
				}
				config.rules[ruleName] = rule.defaultValue;
			}
		}
	} else if (mode === 'recommended') {
		config.extends = [...(config.extends || []), 'markuplint:recommended'];
	} else {
		config.rules = {};
		const ruleNames = Object.keys(defaultRules);
		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			config.rules[ruleName] = rule.defaultValue;
		}
	}

	return config;
}
