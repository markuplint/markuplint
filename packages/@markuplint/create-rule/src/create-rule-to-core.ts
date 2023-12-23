import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import { fsExists } from './fs-exists.js';
import { installScaffold } from './install-scaffold.js';
import { searchCoreRepository } from './search-core-repository.js';

const rulesRelDir = ['packages', '@markuplint', 'rules', 'src'];

export async function createRuleToCore({ ruleName, core }: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	if (!core) {
		throw new CreateRuleHelperError('Core options are not defined');
	}

	const rulesDir = await getRulesDir();
	const newRuleDir = path.resolve(rulesDir, ruleName);

	const exists = await fsExists(newRuleDir);
	if (exists) {
		throw new CreateRuleHelperError(`A new rule "${ruleName}" already exists`);
	}

	return await installScaffold('core', newRuleDir, {
		pluginName: '',
		ruleName,
		lang: 'TYPESCRIPT',
		needTest: true,
		core,
	});
}

export async function getRulesDir() {
	const rootDir = await searchCoreRepository();

	if (!rootDir) {
		throw new CreateRuleHelperError('The repository of markuplint is not found');
	}

	const rulesDir = path.resolve(rootDir, ...rulesRelDir);
	const exists = await fsExists(rulesDir);

	if (!exists) {
		throw new CreateRuleHelperError(`Core rules directory (${rulesDir}) is not found`);
	}

	return rulesDir;
}
