import { prompt } from 'enquirer';

export async function initialize() {
	write('markuplit initialization');
	write.break();

	const res = await prompt([
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
				{ name: 'Mustache/Handlbars', value: 'mustache' },
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
			message: 'Do you customize rules?',
			name: 'customize',
			type: 'confirm',
		},
	]);

	// WIP
	console.log(res);
}

function write(message: string) {
	process.stdout.write(message + '\n');
}

write.break = () => process.stdout.write('\n');
