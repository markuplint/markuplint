export interface Config {
	$schema?: string;
	parser?: ParserConfig;
	extends?: string | string[];
	rules?: Rules;
	nodeRules?: NodeRule[];
	childNodeRule?: ChildNodeRule[];
	ignore?: string | string[];
}

export interface ParserConfig {
	[extensionPattern: string]: string /* module name or path */;
}

export interface Rules {
	[ruleName: string]: RuleConfig | RuleSettingValue;
}

export type RuleConfig = [Severity, RuleSettingValue, RuleSettingOptions | undefined];

export type Severity = 'error' | 'warning' | 'info';

export type RuleSettingValue = string | number | boolean | null;

export interface RuleSettingOptions {
	[optionName: string]: RuleSettingValue;
}

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
