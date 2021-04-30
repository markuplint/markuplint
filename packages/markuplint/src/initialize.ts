import { Config } from '@markuplint/ml-config';
import fs from 'fs';
import { installModule } from './install-module';
import path from 'path';
import { prompt } from 'enquirer';
import util from 'util';

const writeFile = util.promisify(fs.writeFile);

const defaultRules = {
	'attr-duplication': true,
	'character-reference': true,
	'deprecated-attr': true,
	'deprecated-element': true,
	doctype: true,
	'id-duplication': true,
	'permitted-contents': true,
	'required-attr': true,
	'invalid-attr': true,
	'landmark-roles': true,
	'required-h1': true,
	'class-naming': false,
	'attr-equal-space-after': true,
	'attr-equal-space-before': true,
	'attr-spacing': true,
	'attr-value-quotes': true,
	'case-sensitive-attr-name': true,
	'case-sensitive-tag-name': true,
	indentation: false,
	'wai-aria': true,
};

const extRExp = {
	vue: '\\.vue$',
	svelte: '\\.svelte$',
	pug: '\\.pug$',
	php: '\\.php$',
	erb: '\\.erb$',
	ejs: '\\.ejs$',
	mustache: '\\.(mustache|handlebars)$',
	nunjucks: '\\.nunjucks$',
	liquid: '\\.liquid$',
};

export async function initialize() {
	const config: Config = {};

	write('markuplit initialization');
	write.break();

	const res = await prompt<{
		langs: string[];
		autoInstall: boolean;
		customize: boolean;
	}>([
		{
			message: 'Which do you use template engines?',
			name: 'langs',
			type: 'multiselect',
			choices: [
				{ name: 'Vue', value: 'vue' },
				{ name: 'Svelte', value: 'svelte' },
				{ name: 'Pug', value: 'pug' },
				{ name: 'PHP', value: 'php' },
				{ name: 'eRuby', value: 'erb' },
				{ name: 'EJS', value: 'ejs' },
				{ name: 'Mustache/Handlebars', value: 'mustache' },
				{ name: 'Nunjucks', value: 'nunjucks' },
				{ name: 'liquid (Shopify)', value: 'liquid' },
			],
			result(names) {
				// @ts-ignore
				const map = this.map(names);
				// @ts-ignore
				const values = names.map(name => map[name]);
				return values;
			},
		},
		{
			message: 'May I install them automatically?',
			name: 'autoInstall',
			type: 'confirm',
		},
		{
			message: 'Do you customize rules?',
			name: 'customize',
			type: 'confirm',
		},
	]);

	if (res.langs && res.langs.length) {
		config.parser = {};
	}

	for (const lang of res.langs) {
		if (!config.parser) {
			continue;
		}
		// @ts-ignore
		const ext: string | undefined = extRExp[lang];
		if (!ext) {
			continue;
		}
		config.parser[ext] = `@markuplint/${lang}-parser`;

		if (lang === 'vue') {
			config.specs = ['@markuplint/vue-spec'];
		}
	}

	if (res.customize) {
		// TODO: Customization
	} else {
		config.rules = defaultRules;
	}

	const filePath = path.resolve(process.cwd(), '.markuplintrc');
	await writeFile(filePath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
	write(`✨Created: ${filePath}`);

	if (res.autoInstall) {
		write('Insatll automatically');

		const modules = res.langs.map(lang => `@markuplint/${lang}-parser`);

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
