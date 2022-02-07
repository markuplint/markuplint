import type { Config } from '@markuplint/ml-config';

import fs from 'fs';
import path from 'path';
import util from 'util';

import { mergeConfig } from '@markuplint/ml-config';

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
	'character-reference': {
		category: 'validation',
		default: true,
	},
	'deprecated-attr': {
		category: 'validation',
		default: true,
	},
	'deprecated-element': {
		category: 'validation',
		default: true,
	},
	doctype: {
		category: 'validation',
		default: true,
	},
	'id-duplication': {
		category: 'validation',
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
	'invalid-attr': {
		category: 'validation',
		default: true,
	},
	'landmark-roles': {
		category: 'a11y',
		default: true,
	},
	'required-h1': {
		category: 'a11y',
		default: true,
	},
	'wai-aria': {
		category: 'a11y',
		default: true,
	},
	'class-naming': {
		category: 'naming-convention',
		default: false,
		recommendedValue: '/.+/',
	},
	'attr-equal-space-after': {
		category: 'style',
		default: true,
	},
	'attr-equal-space-before': {
		category: 'style',
		default: true,
	},
	'attr-spacing': {
		category: 'style',
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
	'case-sensitive-tag-name': {
		category: 'style',
		default: true,
	},
	indentation: {
		category: 'style',
		default: false,
		recommendedValue: 2,
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

	write('markuplit initialization');
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
		config.rules = {};
		const ruleNames = Object.keys(defaultRules);
		for (const ruleName of ruleNames) {
			const rule = defaultRules[ruleName];
			config.rules[ruleName] = rule.default;
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

function write(message: string) {
	process.stdout.write(message + '\n');
}

write.break = () => process.stdout.write('\n');

function error(message: string) {
	process.stderr.write(message + '\n');
}

error.exit = () => process.exit(1);
