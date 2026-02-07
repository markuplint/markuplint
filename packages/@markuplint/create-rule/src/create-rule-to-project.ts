import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import { fsExists } from './fs-exists.js';
import { installScaffold } from './install-scaffold.js';

/**
 * Scaffolds a new markuplint rule as a local plugin directory within the
 * current project. Creates a new directory named after the plugin in the cwd.
 *
 * @param params - The rule creation parameters (plugin name, rule name, language, test preference).
 * @returns The scaffold result containing generated files and dependencies.
 * @throws {CreateRuleHelperError} If the target plugin directory already exists.
 */
export async function createRuleToProject({
	pluginName,
	ruleName,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const pluginDir = path.resolve(process.cwd(), pluginName);

	if (await fsExists(pluginDir)) {
		throw new CreateRuleHelperError(`The directory exists: ${pluginDir}`);
	}

	return await installScaffold('project', pluginDir, {
		pluginName,
		ruleName,
		lang,
		needTest,
	});
}
