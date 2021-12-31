import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import path from 'path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { fsExists } from './fs-exists';
import { installScaffold } from './install-scaffold';

export async function craeteRuleToProject({
	name,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const newRuleDir = path.resolve(process.cwd(), name);

	if (await fsExists(newRuleDir)) {
		throw new CreateRuleHelperError(`The directory exists: ${newRuleDir}`);
	}

	return await installScaffold('', newRuleDir, { name, lang, needTest });
}
