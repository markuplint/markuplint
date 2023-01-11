import type { ParserOptions } from '@markuplint/ml-ast';
import type { RegexSelector } from '@markuplint/selector';
import type { Nullable } from '@markuplint/shared';

export type { RegexSelector } from '@markuplint/selector';

export type Config = {
	readonly $schema?: string;
	readonly extends?: string | readonly string[];
	readonly plugins?: readonly (PluginConfig | string)[];
	readonly parser?: ParserConfig;
	readonly parserOptions?: ParserOptions;
	readonly specs?: SpecConfig;
	readonly excludeFiles?: readonly string[];
	readonly pretenders?: readonly Pretender[];
	readonly rules?: Rules;
	readonly nodeRules?: readonly NodeRule[];
	readonly childNodeRules?: readonly ChildNodeRule[];
	readonly overrides?: Readonly<Record<string, OverrideConfig>>;
};

export type PrimitiveScalar = string | number | boolean;

export type PlainData =
	| Nullable<PrimitiveScalar>
	| readonly PlainData[]
	| {
			readonly [key: string]: PlainData | any;
	  };

export type NonNullablePlainData =
	| PrimitiveScalar
	| readonly NonNullablePlainData[]
	| {
			readonly [key: string]: NonNullablePlainData;
	  };

export type OverrideConfig = Omit<Config, '$schema' | 'extends' | 'overrides'>;

export type PluginConfig = {
	readonly name: string;
	readonly settings: Readonly<Record<string, NonNullablePlainData>>;
};

export type ParserConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

export type SpecConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

export type Pretender = {
	/**
	 * Target node selectors
	 */
	readonly selector: string;

	/**
	 * If it is a string, it is resolved as an element name.
	 * An element has the same attributes as the pretended custom element
	 * because attributes are just inherited.
	 *
	 * If it is an Object, It creates the element by that.
	 */
	readonly as: string | OriginalNode;
};

export type OriginalNode = {
	/**
	 * Element name
	 */
	readonly element: string;

	/**
	 * Namespace
	 *
	 * Supports `"svg"` and `undefined` only.
	 * If it is `undefined`, the namespace is HTML.
	 */
	readonly namespace?: 'svg';

	/**
	 * Attributes
	 */
	attrs?: PretenderAttr[];

	/**
	 * To have attributes the defined element has.
	 */
	readonly inheritAttrs?: boolean;

	/**
	 * ARIA properties
	 */
	readonly aria?: PretenderARIA;
};

export type PretenderAttr = {
	/**
	 * Attribute name
	 */
	readonly name: string;

	/**
	 * If it omits this property, the attribute is resolved as a boolean.
	 */
	readonly value?:
		| string
		| {
				readonly fromAttr: string;
		  };
};

/**
 * Pretender Node ARIA properties
 */
export type PretenderARIA = {
	/**
	 * Accessible name
	 *
	 * - If it is `true`, it assumes the element has any text on its accessible name.
	 * - If it specifies `fromAttr` property, it assumes the accessible name refers to the value of the attribute.
	 */
	readonly name?:
		| boolean
		| {
				readonly fromAttr: string;
		  };
};

export type Rule<T extends RuleConfigValue, O extends PlainData = undefined> = RuleConfig<T, O> | Readonly<T> | boolean;

/**
 * @deprecated
 */
export type RuleV2<T extends RuleConfigValue, O extends PlainData = undefined> =
	| RuleConfigV2<T, O>
	| Readonly<T>
	| boolean;

export type AnyRule = Rule<RuleConfigValue, PlainData>;

/**
 * @deprecated
 */
export type AnyRuleV2 = RuleV2<RuleConfigValue, PlainData>;

export type Rules = {
	readonly [ruleName: string]: AnyRule;
};

export type RuleConfig<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly severity?: Severity;
	readonly value?: Readonly<T>;
	readonly options?: Readonly<O>;
	readonly reason?: string;
};

/**
 * @deprecated
 */
export type RuleConfigV2<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly severity?: Severity;
	readonly value?: Readonly<T>;
	readonly reason?: string;

	/**
	 * Old property
	 *
	 * @deprecated
	 * @see {this.options}
	 */
	readonly option?: Readonly<O>;
};

export type Severity = 'error' | 'warning' | 'info';

export type RuleConfigValue = PrimitiveScalar | readonly (PrimitiveScalar | Readonly<Record<string, any>>)[] | null;

export type NodeRule = {
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly categories?: readonly string[];
	readonly roles?: readonly string[];
	readonly obsolete?: boolean;
	readonly rules?: Rules;
};

export type ChildNodeRule = {
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly inheritance?: boolean;
	readonly rules?: Rules;
};

export type Report<T extends RuleConfigValue, O extends PlainData = undefined> =
	| Report1<T, O>
	| Report2
	| (Report1<T, O> & Report2);

export type Report1<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly message: string;
	readonly scope: Scope<T, O>;
};

export type Report2 = {
	readonly message: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

export type Scope<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly rule: RuleInfo<T, O>;
	readonly startLine: number;
	readonly startCol: number;
	readonly raw: string;
};

export type Violation = {
	readonly ruleId: string;
	readonly severity: Severity;
	readonly message: string;
	readonly reason?: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

export type RuleInfo<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly disabled: boolean;
	readonly severity: Severity;
	readonly value: Readonly<T>;
	readonly options: Readonly<O>;
	readonly reason?: string;
};

export type GlobalRuleInfo<T extends RuleConfigValue, O extends PlainData = undefined> = RuleInfo<T, O> & {
	nodeRules: RuleInfo<T, O>[];
	childNodeRules: RuleInfo<T, O>[];
};
