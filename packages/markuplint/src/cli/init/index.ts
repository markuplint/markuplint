import type { Config } from '@markuplint/ml-config';

import fs from 'fs';
import path from 'path';
import util from 'util';

import { mergeConfig } from '@markuplint/ml-config';

import { head, write, error } from '../../util';
import { confirm, confirmSequence, multiSelect } from '../prompt';

import { installModule } from './install-module';

const writeFile = util.promisify(fs.writeFile);

type Category = 'validation' | 'a11y' | 'naming-convention' | 'style';

const ruleCategories: Record<
	Category,
	{
		message: string;
	}
> = {
	validation: {
		message: 'Are you going to conformance check according to HTML standard?',
	},
	a11y: {
		message: 'Are you going to do with accessibility better practices?',
	},
	'naming-convention': {
		message: 'Are you going to set the convention about naming?',
	},
	style: {
		message: 'Are you going to check for the code styles?',
	},
};

const defaultRules: Record<
	string,
	{
		category: Category;
		default: boolean;
		recommendedValue?: string | number | boolean;
	}
> = {
	'attr-duplication': {
		category: 'validation',
		default: true,
	},
	'attr-value-quotes': {
		category: 'style',
		default: true,
	},
	'case-sensitive-attr-name': {
		category: 'style',
		default: true,
	},
	'case-sensitive-attr-value': {
		category: 'style',
		default: true,
	},
	'case-sensitive-tag-name': {
		category: 'style',
		default: true,
	},
	'character-reference': {
		category: 'validation',
		default: true,
	},
	'class-naming': {
		category: 'naming-convention',
		default: false,
		recommendedValue: '/.+/',
	},
	'deprecated-attr': {
		category: 'validation',
		default: true,
	},
	'deprecated-element': {
		category: 'validation',
		default: true,
	},
	'disallowed-element': {
		category: 'validation',
		default: false,
	},
	doctype: {
		category: 'validation',
		default: true,
	},
	'end-tag': {
		category: 'style',
		default: true,
	},
	'id-duplication': {
		category: 'validation',
		default: true,
	},
	'ineffective-attr': {
		category: 'validation',
		default: true,
	},
	'invalid-attr': {
		category: 'validation',
		default: true,
	},
	'landmark-roles': {
		category: 'a11y',
		default: true,
	},
	'no-boolean-attr-value': {
		category: 'style',
		default: true,
	},
	'no-default-value': {
		category: 'style',
		default: true,
	},
	'no-hard-code-id': {
		category: 'style',
		default: true,
	},
	'no-refer-to-non-existent-id': {
		category: 'a11y',
		default: true,
	},
	'no-use-event-handler-attr': {
		category: 'style',
		default: true,
	},
	'permitted-contents': {
		category: 'validation',
		default: true,
	},
	'required-attr': {
		category: 'validation',
		default: true,
	},
	'required-element': {
		category: 'validation',
		default: true,
	},
	'required-h1': {
		category: 'a11y',
		default: true,
	},
	'use-list': {
		category: 'a11y',
		default: false,
	},
	'wai-aria': {
		category: 'a11y',
		default: true,
	},
};

const extRExp = {
	jsx: '\\.[jt]sx?$',
	vue: '\\.vue$',
	svelte: '\\.svelte$',
	astro: '\\.astro',
	pug: '\\.pug$',
	php: '\\.php$',
	erb: '\\.erb$',
	ejs: '\\.ejs$',
	mustache: '\\.(mustache|handlebars)$',
	nunjucks: '\\.nunjucks$',
	liquid: '\\.liquid$',
};

export async function initialize() {
	let config: Config = {};

	write(head('Initialization'));
	write.break();

	const langs = await multiSelect({
		message: 'Which do you use template engines?',
		choices: [
			{ name: 'React (JSX)', value: 'jsx' },
			{ name: 'Vue', value: 'vue' },
			{ name: 'Svelte', value: 'svelte' },
			{ name: 'Astro', value: 'astro' },
			{ name: 'Pug', value: 'pug' },
			{ name: 'PHP', value: 'php' },
			{ name: 'Smarty', value: 'smarty' },
			{ name: 'eRuby', value: 'erb' },
			{ name: 'EJS', value: 'ejs' },
			{ name: 'Mustache/Handlebars', value: 'mustache' },
			{ name: 'Nunjucks', value: 'nunjucks' },
			{ name: 'liquid (Shopify)', value: 'liquid' },
		],
	});

	const autoInstall = await confirm('May I install them automatically?');

	const customize = await confirm('Do you customize rules?');

	for (const lang of langs) {
		config.parser = config.parser || {};
		// @ts-ignore
		const ext: string | undefined = extRExp[lang];
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

	if (customize) {
		const ruleNames = Object.keys(defaultRules);
		const categories = Object.keys(ruleCategories) as Category[];

		const res = await confirmSequence(
			categories.map(catName => {
				const cat = ruleCategories[catName];
				return {
					message: cat.message,
					name: catName,
				};
			}),
		);

		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			if (!rule) {
				continue;
			}
			if (res[rule.category]) {
				if (!config.rules) {
					config.rules = {};
				}
				config.rules[ruleName] = rule.recommendedValue || true;
			}
		}
	} else {
		const recommended = await confirm('Does it import the recommended config?');

		if (recommended) {
			config.extends = [...(config.extends || []), 'markuplint:recommended'];
		} else {
			config.rules = {};
			const ruleNames = Object.keys(defaultRules);
			for (const ruleName of ruleNames) {
				const rule = defaultRules[ruleName];
				config.rules[ruleName] = rule.default;
			}
		}
	}

	const filePath = path.resolve(process.cwd(), '.markuplintrc');
	await writeFile(filePath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
	write(`✨Created: ${filePath}`);

	if (autoInstall) {
		write('Install automatically');

		const modules = ['markuplint', ...langs.map(lang => `@markuplint/${lang}-parser`)];

		if (langs.includes('vue')) {
			modules.push('@markuplint/vue-spec');
		}
		if (langs.includes('jsx')) {
			modules.push('@markuplint/react-spec');
		}

		const result = await installModule(modules, true).catch(e => new Error(e));
		if (result instanceof Error) {
			error.exit();
			return;
		}
		if (result.alreadyExists) {
			write('Modules are installed already.');
		} else {
			write('✨ Success');
		}
	}
}
