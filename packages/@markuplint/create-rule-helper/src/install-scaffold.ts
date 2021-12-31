import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import { promises as fs } from 'fs';
import path from 'path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { fsExists } from './fs-exists';
import { transfer } from './transfer';

export async function installScaffold(
	scaffoldDir: string,
	dest: string,
	params: CreateRuleCreatorParams,
): Promise<CreateRuleHelperResult> {
	const exists = await fsExists(dest);
	if (exists) {
		throw new CreateRuleHelperError(`A new rule "${params.name}" already exists`);
	}
	await fs.mkdir(dest);

	const scaffoldReadmeFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'README.md');
	const scaffoldMainFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'index.ts');
	const scaffoldTestFile = path.resolve(__dirname, '..', 'scaffold', scaffoldDir, 'index.spec.ts');

	const transpile = params.lang === 'JAVASCRIPT';
	const readme = await transfer(scaffoldReadmeFile, dest, { name: params.name });
	const main = await transfer(scaffoldMainFile, dest, { name: params.name }, { transpile });
	const test = params.needTest ? await transfer(scaffoldTestFile, dest, { name: params.name }, { transpile }) : null;

	return {
		...params,
		readme,
		main,
		test,
	};
}
