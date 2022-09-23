import type { ParserOptions } from '@markuplint/ml-ast';
import type { RegexSelector } from '@markuplint/selector';

export type { RegexSelector } from '@markuplint/selector';

export interface Config {
	$schema?: string;
	extends?: string | string[];
	plugins?: (PluginConfig | string)[];
	parser?: ParserConfig;
	parserOptions?: ParserOptions;
	specs?: SpecConfig;
	excludeFiles?: string[];
	pretenders?: Pretender[];
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

export type SpecConfig = {
	[extensionPattern: string]: string /* module name or path */;
};

export type Pretender = {
	/**
	 * Target node selectors
	 */
	selector: string;

	/**
	 * If it is a string, it is resolved as an element name.
	 * An element has the same attributes as the pretended custom element
	 * because attributes are just inherited.
	 *
	 * If it is an Object, It creates the element by that.
	 */
	as: string | OriginalNode;
};

export type OriginalNode = {
	/**
	 * Element name
	 */
	element: string;

	/**
	 * Namespace
	 *
	 * Supports `"svg"` and `undefined` only.
	 * If it is `undefined`, the namespace is HTML.
	 */
	namespace?: 'svg';

	/**
	 * Attributes
	 */
	attrs?: {
		/**
		 * Attribute name
		 */
		name: string;

		/**
		 * If it omits this property, the attribute is resolved as a boolean.
		 */
		value?: string;
	}[];
};

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
