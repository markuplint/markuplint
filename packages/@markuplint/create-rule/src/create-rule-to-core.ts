import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import { fsExists } from './fs-exists.js';
import { installScaffold } from './install-scaffold.js';
import { searchCoreRepository } from './search-core-repository.js';

/**
 * Relative path segments from the monorepo root to the core rules source directory.
 */
const rulesRelDir = ['packages', '@markuplint', 'rules', 'src'];

/**
 * Scaffolds a new rule within the markuplint core rules directory.
 *
 * Creates the rule in the `packages/@markuplint/rules/src/<ruleName>` directory
 * of the monorepo. Requires core-specific parameters (description, category, severity)
 * and always uses TypeScript with tests enabled.
 *
 * @param params - The rule creation parameters. The `core` property is required.
 * @returns The scaffold result containing generated files and dependencies.
 * @throws {CreateRuleHelperError} If core options are not defined or a rule with the same name already exists.
 */
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

/**
 * Resolves the absolute path to the core rules source directory within the
 * markuplint monorepo. Searches upward from the cwd for the repository root
 * and then constructs the path to `packages/@markuplint/rules/src`.
 *
 * @returns The absolute path to the core rules directory.
 * @throws {CreateRuleHelperError} If the monorepo root or the core rules directory is not found.
 */
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
