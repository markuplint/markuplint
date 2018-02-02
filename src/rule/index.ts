import Document from '../dom/document';
import Ruleset from '../ruleset';
import { ConfigureFileJSONRuleOption } from '../ruleset/JSONInterface';

import CustomRule from './custom-rule';

export interface VerifyReturn {
	level: RuleLevel;
	message: string;
	line: number;
	col: number;
	raw: string;
}

export interface VerifiedResult extends VerifyReturn {
	ruleId: string;
}

export interface CustomVerifiedReturn extends VerifyReturn {
	ruleId?: string;
}

export type RuleLevel = 'error' | 'warning';

export interface RuleConfig<T = null, O = {}> {
	disabled: boolean;
	level: RuleLevel;
	value: T;
	option: O | null;
}
