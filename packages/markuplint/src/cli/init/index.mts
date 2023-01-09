import type { Category, DefaultRules, Langs, RuleSettingMode } from './types.mjs';

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { head, write, error } from '../../util.mjs';
import { confirm, confirmSequence, multiSelect } from '../prompt.mjs';

import { createConfig, langs } from './create-config.mjs';
import { getDefaultRules } from './get-default-rules.mjs';
import { installModule, selectModules } from './install-module.mjs';

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
	// @ts-ignore
	const version = (await import('../../../package.json', { assert: { type: 'json' } })).default.version;

	write(head('Initialization', version));
	write.break();

	const selectedLangs = await multiSelect<Langs>({
		message: 'Which do you use template engines?',
		choices: Object.entries(langs).map(([key, name]) => ({ name, value: key as Langs })),
	});

	const autoInstall = await confirm('May I install them automatically?');
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
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const rulesVersion: string = require('../../../package.json').version;
		defaultRules = await getDefaultRules(rulesVersion);
	}

	const config = createConfig(selectedLangs, ruleSettingMode, defaultRules);

	const filePath = path.resolve(process.cwd(), '.markuplintrc');
	await writeFile(filePath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
	write(`✨Created: ${filePath}`);

	if (autoInstall) {
		write('Install automatically');

		const modules = selectModules(selectedLangs);

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
