export interface Config {
	$schema?: string;
	parser?: ParserConfig;
	extends?: string | string[];
	rules?: Rules;
	nodeRules?: NodeRule[];
	childNodeRules?: ChildNodeRule[];
	ignore?: string | string[];
}

export interface ParserConfig {
	[extensionPattern: string]: string /* module name or path */;
}

export type Rule = RuleConfig<RuleConfigValue, unknown> | RuleConfigValue;

export interface Rules {
	[ruleName: string]: Rule;
}

export type RuleConfig<T extends RuleConfigValue, O = void> = {
	severity?: Severity;
	value?: T;
	option?: O;
};

export type Severity = 'error' | 'warning' | 'info';

export type RuleConfigValue = string | number | boolean | any[] | null;

export interface NodeRule {
	tagName?: string;
	selector?: string;
	categories?: string[];
	roles?: string[];
	obsolete?: boolean;
	rules?: Rules;
}

export interface ChildNodeRule {
	tagName?: string;
	selector?: string;
	inheritance?: boolean;
	rules?: Rules;
}

export interface Result {
	severity: Severity;
	message: string;
	line: number;
	col: number;
	raw: string;
}

export interface VerifiedResult extends Result {
	ruleId: string;
}

export interface RuleInfo<T extends RuleConfigValue, O = null> {
	disabled: boolean;
	severity: Severity;
	value: T;
	option: O;
}
