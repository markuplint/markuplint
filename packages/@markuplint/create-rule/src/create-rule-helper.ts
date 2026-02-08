import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types.js';

import { createRulePackage } from './create-rule-package.js';
import { createRuleToCore } from './create-rule-to-core.js';
import { createRuleToProject } from './create-rule-to-project.js';

/**
 * Dispatches rule creation to the appropriate scaffolding function based on the
 * specified purpose. Acts as the central entry point for programmatic rule creation.
 *
 * @param params - The helper parameters including purpose, plugin name, rule name, language, and options.
 * @returns The scaffold result containing generated files and dependencies.
 */
export async function createRuleHelper(params: CreateRuleHelperParams): Promise<CreateRuleHelperResult> {
	switch (params.purpose) {
		case 'ADD_TO_PROJECT': {
			return await createRuleToProject(params);
		}
		case 'PUBLISH_AS_PACKAGE': {
			return await createRulePackage(params);
		}
		case 'CONTRIBUTE_TO_CORE': {
			return await createRuleToCore(params);
		}
	}
}
