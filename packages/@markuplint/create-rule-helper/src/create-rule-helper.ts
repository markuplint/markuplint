import type { CreateRuleHelperParams, CreateRuleHelperResult } from './types';

import { craeteRuleToCore } from './create-rule-to-core';

export async function createRuleHelper(params: CreateRuleHelperParams): Promise<CreateRuleHelperResult> {
	switch (params.purpose) {
		case 'ADD_TO_PROJECT': {
			throw new Error('Not implemented yet');
		}
		case 'PUBLISH_AS_PACKAGE': {
			throw new Error('Not implemented yet');
		}
		case 'CONTRIBUTE_TO_CORE': {
			return await craeteRuleToCore(params);
		}
	}
}
