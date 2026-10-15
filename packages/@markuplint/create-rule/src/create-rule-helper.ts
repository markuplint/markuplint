import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types.js';

import { createRulePackage } from './create-rule-package.js';
import { createRuleToCore } from './create-rule-to-core.js';
import { createRuleToProject } from './create-rule-to-project.js';

/**
 * Generates the scaffold of a new rule for the given purpose.
 *
 * @param params - What to generate and where (see {@link CreateRuleHelperParams}).
 * `core` is required when `purpose` is `CONTRIBUTE_TO_CORE`.
 * @returns The generated files and the dependencies to install.
 * @throws {CreateRuleHelperError} The destination already exists or is not
 * empty, `core` is missing for `CONTRIBUTE_TO_CORE`, or the markuplint
 * repository cannot be found for it.
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
