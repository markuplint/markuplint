import type { CreateRuleCreatorParams, CreateRuleHelperResult } from './types.js';

import path from 'node:path';

import { CreateRuleHelperError } from './create-rule-helper-error.js';
import { glob } from './glob.js';
import { installScaffold } from './install-scaffold.js';

/**
 * Scaffolds a new markuplint rule as a standalone publishable npm package
 * in the current working directory.
 *
 * Validates that the current directory is empty before proceeding.
 * Generates a complete package structure including `package.json`.
 *
 * @param params - The rule creation parameters (plugin name, rule name, language, test preference).
 * @returns The scaffold result containing generated files and dependencies.
 * @throws {CreateRuleHelperError} If the current directory is not empty.
 */
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
