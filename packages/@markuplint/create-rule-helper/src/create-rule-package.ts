import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import path from 'node:path';
import util from 'node:util';

import glob from 'glob';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { installScaffold } from './install-scaffold';

const asyncGlob = util.promisify(glob);

export async function createRulePackage({
	name,
	lang,
	needTest,
}: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const newRuleDir = path.resolve(process.cwd(), '*');

	const files = await asyncGlob(newRuleDir);

	if (files.length) {
		throw new CreateRuleHelperError('The directory is not empty');
	}

	return await installScaffold('plugin', process.cwd(), 'src', { name, lang, needTest, packageJson: true });
}
