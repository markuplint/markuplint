import type { Category, DefaultRules, Langs, RuleSettingMode } from './types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { installModule, multiSelect, confirm, confirmSequence, header } from '@markuplint/cli-utils';

import { createConfig, langs } from './create-config.js';
import { getDefaultRules } from './get-default-rules.js';
import { selectModules } from './select-modules.js';

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
		message: 'Do you want high accessibility?',
	},
	'naming-convention': {
		message: 'Are you going to set the convention about naming?',
	},
	maintainability: {
		message: 'Do you want high maintainability?',
	},
	style: {
		message: 'Are you going to check for the code styles?',
	},
};

export async function initialize() {
	process.stdout.write(header('Initialization'));
	process.stdout.write('\n');
	process.stdout.write('\n');

	const selectedLangs = await multiSelect<Langs>({
		message: 'Which do you use template engines?',
		choices: Object.entries(langs).map(([key, name]) => ({ name, value: key as Langs })),
	});

	const autoInstall = await confirm('Install npm dependencies?');
	const customize = await confirm('Do you customize rules?');

	let ruleSettingMode: RuleSettingMode = 'none';

	if (customize) {
		const categories = Object.keys(ruleCategories) as Category[];
		const selectedCategories = await confirmSequence(
			categories.map(catName => {
				const cat = ruleCategories[catName];
				return {
					message: cat.message,
					name: catName,
				};
			}),
		);

		ruleSettingMode = Object.entries(selectedCategories)
			.map(([name, enabled]) => (enabled ? name : ''))
			.filter((name): name is Category => !!name);
	} else if (await confirm('Does it import the recommended config?')) {
		ruleSettingMode = 'recommended';
	}

	let defaultRules: DefaultRules = {};
	if (ruleSettingMode !== 'recommended') {
		defaultRules = getDefaultRules();
	}

	const config = createConfig(selectedLangs, ruleSettingMode, defaultRules);

	const filePath = path.resolve(process.cwd(), '.markuplintrc');
	await fs.writeFile(filePath, JSON.stringify(config, null, 2), { encoding: 'utf8' });
	process.stdout.write(`✨Created: ${filePath}\n`);

	if (autoInstall) {
		process.stdout.write('Install the dependencies automatically\n');

		const modules = selectModules(selectedLangs);

		const result = await installModule(modules, true).catch(error_ => new Error(error_));
		if (result instanceof Error) {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(1);
		}
		if (result.alreadyExists) {
			process.stdout.write('Modules are installed already.\n');
		} else {
			process.stdout.write('✨ Success\n');
		}
	}
}
