import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types';

import { createRulePackage } from './create-rule-package';
import { createRuleToCore } from './create-rule-to-core';
import { createRuleToProject } from './create-rule-to-project';

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
