import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types.js';

import { createRulePackage } from './create-rule-package.js';
import { createRuleToCore } from './create-rule-to-core.js';
import { createRuleToProject } from './create-rule-to-project.js';

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
