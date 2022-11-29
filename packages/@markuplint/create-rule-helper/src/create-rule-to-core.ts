import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import path from 'path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { fsExists } from './fs-exists';
import { installScaffold } from './install-scaffold';
import { searchCoreRepository } from './search-core-repository';

const rulesRelDir = ['packages', '@markuplint', 'rules', 'src'];

export async function createRuleToCore({
	name,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const rulesDir = await getRulesDir();
	const newRuleDir = path.resolve(rulesDir, name);

	const exists = await fsExists(newRuleDir);
	if (exists) {
		throw new CreateRuleHelperError(`A new rule "${name}" already exists`);
	}

	return await installScaffold('core', newRuleDir, '', {
		name,
		lang,
		needTest,
		schemaJson: true,
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
