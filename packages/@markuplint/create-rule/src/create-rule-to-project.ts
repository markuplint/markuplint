import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import { fsExists } from './fs-exists.js';
import { installScaffold } from './install-scaffold.js';

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
