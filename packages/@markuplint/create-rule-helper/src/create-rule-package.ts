import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import glob from './glob.js';
import { installScaffold } from './install-scaffold.js';

export async function createRulePackage({
	pluginName,
	ruleName,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const newRuleDir = path.resolve(process.cwd(), '*');

	const files = await glob(newRuleDir);

	if (files.length > 0) {
		throw new CreateRuleHelperError('The directory is not empty');
	}

	return await installScaffold('package', process.cwd(), {
		pluginName,
		ruleName,
		lang,
		needTest,
		packageJson: true,
	});
}
