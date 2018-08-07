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

export interface Rules {
	[ruleName: string]: RuleConfig<RuleConfigValue, RuleConfigOptions> | RuleConfigValue;
}

export type RuleConfig<T extends RuleConfigValue, O extends RuleConfigOptions> = [Severity, T, O];

export type Severity = 'error' | 'warning' | 'info';

export type RuleConfigValue = string | number | boolean | null;

export interface RuleConfigOptionsStructure {
	[optionName: string]: RuleConfigValue;
}

export type RuleConfigOptions = RuleConfigOptionsStructure | null;

export interface NodeRule {
	tagName?: string;
	selector?: string;
	rules: Rules;
}

export interface ChildNodeRule {
	tagName?: string;
	selector?: string;
	inheritance: boolean;
	rules: Rules;
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

export interface RuleInfo<T extends RuleConfigValue, O extends RuleConfigOptions> {
	disabled: boolean;
	severity: Severity;
	value: T;
	option: O;
}
