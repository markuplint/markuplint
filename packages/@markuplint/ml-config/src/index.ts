// tslint:disable:no-any

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
	[ruleName: string]: RuleConfig<any /* unknown for TS3.0 */, any> | RuleConfigValue;
}

export type RuleConfig<T extends RuleConfigValue, O extends RuleConfigOptions> = [Severity, T, O | undefined];

export type Severity = 'error' | 'warning' | 'info';

export type RuleConfigValue = string | number | boolean | null;

export interface RuleConfigOptions {
	[optionName: string]: RuleConfigValue;
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
