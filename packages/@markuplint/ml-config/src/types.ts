export interface Config {
	$schema?: string;
	extends?: string | string[];
	parser?: ParserConfig;
	parserOptions?: ParserOptions;
	specs?: SpecConfig | SpecConfig_v1;
	importRules?: string[];
	excludeFiles?: string[];
	rules?: Rules;
	nodeRules?: NodeRule[];
	childNodeRules?: ChildNodeRule[];
}

export interface ParserConfig {
	[extensionPattern: string]: string /* module name or path */;
}

export type ParserOptions = {
	ignoreFrontMatter?: boolean;
};

export type SpecConfig = {
	[extensionPattern: string]: string /* module name or path */;
};

/**
 * @deprecated
 */
export type SpecConfig_v1 = string | string[];

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

export interface Violation extends Result {
	ruleId: string;
}

export interface RuleInfo<T extends RuleConfigValue, O = null> {
	disabled: boolean;
	severity: Severity;
	value: T;
	option: O;
}

export type Nullable<T> = T | null | undefined;
