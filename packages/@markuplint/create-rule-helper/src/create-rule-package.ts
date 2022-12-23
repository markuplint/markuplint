import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import glob from './glob';
import { installScaffold } from './install-scaffold';

export async function createRulePackage({
	pluginName,
	ruleName,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const newRuleDir = path.resolve(process.cwd(), '*');

	const files = await glob(newRuleDir);

	if (files.length) {
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
