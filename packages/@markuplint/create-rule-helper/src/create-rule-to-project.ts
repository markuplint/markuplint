import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import { resolve } from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { fsExists } from './fs-exists';
import { installScaffold } from './install-scaffold';

export async function createRuleToProject({
	pluginName,
	ruleName,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const pluginDir = resolve(process.cwd(), pluginName);

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
