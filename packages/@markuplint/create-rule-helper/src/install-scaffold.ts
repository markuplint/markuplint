import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types';

import fs from 'fs/promises';
import path from 'path';

import { CreateRuleHelperError } from './create-rule-helper-error';
import { fsExists } from './fs-exists';
import { transfer } from './transfer';

const SCAFFOLD_README_FILE = path.resolve(__dirname, '..', 'scaffold', 'README.md');
const SCAFFOLD_MAIN_FILE = path.resolve(__dirname, '..', 'scaffold', 'index.ts');
const SCAFFOLD_TEST_FILE = path.resolve(__dirname, '..', 'scaffold', 'index.spec.ts');

export async function installScaffold(dir: string, params: CreateRuleCreatorParams): Promise<CreateRuleHelperResult> {
	const exists = await fsExists(dir);
	if (exists) {
		throw new CreateRuleHelperError(`A new rule "${params.name}" already exists`);
	}
	await fs.mkdir(dir);

	const transpile = params.lang === 'JAVASCRIPT';
	const readme = await transfer(SCAFFOLD_README_FILE, dir, { name: params.name });
	const main = await transfer(SCAFFOLD_MAIN_FILE, dir, { name: params.name }, { transpile });
	const test = params.needTest ? await transfer(SCAFFOLD_TEST_FILE, dir, { name: params.name }, { transpile }) : null;

	return {
		...params,
		readme,
		main,
		test,
	};
}
