import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types';

import { craeteRuleToCore } from './create-rule-to-core';
import { craeteRuleToProject } from './create-rule-to-project';

export async function createRuleHelper(params: CreateRuleHelperParams): Promise<CreateRuleHelperResult> {
	switch (params.purpose) {
		case 'ADD_TO_PROJECT': {
			return await craeteRuleToProject(params);
		}
		case 'PUBLISH_AS_PACKAGE': {
			throw new Error('Not implemented yet');
		}
		case 'CONTRIBUTE_TO_CORE': {
			return await craeteRuleToCore(params);
		}
	}
}
