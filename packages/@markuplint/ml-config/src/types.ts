export interface Config {
	$schema?: string;
	extends?: string | string[];
	plugins?: (PluginConfig | string)[];
	parser?: ParserConfig;
	parserOptions?: ParserOptions;
	specs?: SpecConfig | SpecConfig_v1;
	excludeFiles?: string[];
	rules?: Rules;
	nodeRules?: NodeRule[];
	childNodeRules?: ChildNodeRule[];
	overrides?: Record<string, Omit<Config, '$schema' | 'extends' | 'overrides'>>;
}

export type PluginConfig = {
	name: string;
	settings: Record<string, any>;
};

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

export type Rule<T extends RuleConfigValue, O = void> = RuleConfig<T, O> | T | boolean;

export type AnyRule = Rule<RuleConfigValue, unknown>;
export interface Rules {
	[ruleName: string]: AnyRule;
}

export type RuleConfig<T extends RuleConfigValue, O = void> = {
	severity?: Severity;
	value?: T;
	option?: O;
	reason?: string;
};

export type Severity = 'error' | 'warning' | 'info';

export type RuleConfigValue = string | number | boolean | any[] | null;

export interface NodeRule {
	selector?: string;
	regexSelector?: RegexSelector;
	categories?: string[];
	roles?: string[];
	obsolete?: boolean;
	rules?: Rules;
}

export interface ChildNodeRule {
	selector?: string;
	regexSelector?: RegexSelector;
	inheritance?: boolean;
	rules?: Rules;
}

export type RegexSelector = RegexSelectorWithoutCompination & {
	combination?: {
		combinator: RegexSelectorCombinator;
	} & RegexSelector;
};

export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)';

export type RegexSelectorWithoutCompination = {
	nodeName?: string;
	attrName?: string;
	attrValue?: string;
};

export type Report<T extends RuleConfigValue, O = null> = Report1<T, O> | Report2 | (Report1<T, O> & Report2);

export type Report1<T extends RuleConfigValue, O = null> = {
	message: string;
	scope: Scope<T, O>;
};

export type Report2 = {
	message: string;
	line: number;
	col: number;
	raw: string;
};

export type Scope<T extends RuleConfigValue, O = null> = {
	rule: RuleInfo<T, O>;
	startLine: number;
	startCol: number;
	raw: string;
};

export interface Violation {
	ruleId: string;
	severity: Severity;
	message: string;
	reason?: string;
	line: number;
	col: number;
	raw: string;
}

export interface RuleInfo<T extends RuleConfigValue, O = null> {
	disabled: boolean;
	severity: Severity;
	value: T;
	option: O;
	reason?: string;
}

export type GlobalRuleInfo<T extends RuleConfigValue, O = null> = RuleInfo<T, O> & {
	nodeRules: RuleInfo<T, O>[];
	childNodeRules: RuleInfo<T, O>[];
};

export type Nullable<T> = T | null | undefined;
