export interface PermittedContentOptions {
	required?: boolean;
	times?: 'once' | 'zero or more' | 'one or more' | 'any';
}

export interface ConfigureFileJSON {
	extends?: string | string[];
	rules: ConfigureFileJSONRules;
	nodeRules?: NodeRule[];
	childNodeRules?: NodeRule[];
}

export interface ConfigureFileJSONRules {
	[ruleName: string]: boolean | ConfigureFileJSONRuleOption<null, {}>;
}

export type RuleLevel = 'error' | 'warning';

export type ConfigureFileJSONRuleOption<T, O> = [RuleLevel, T, O];

export interface NodeRule {
	tagName?: string;
	categories?: string[];
	roles?: string[] | NodeRuleRoleConditions[] | null;
	obsolete?: boolean;
	selector?: string;
	rules?: ConfigureFileJSONRules;
	inheritance?: boolean;
}

export interface NodeRuleRoleConditions {
	role: string;
	attrConditions: NodeRuleAttrCondition[];
}

export interface NodeRuleAttrCondition {
	attrName: string;

	/**
	 * Enumerated values
	 */
	values: string[];
}
