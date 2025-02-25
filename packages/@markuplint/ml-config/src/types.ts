import type { ParserOptions } from '@markuplint/ml-ast';
import type { RegexSelector } from '@markuplint/selector';
import type { Nullable } from '@markuplint/shared';
import type { ARIAVersion } from '@markuplint/ml-spec';

export type { RegexSelector } from '@markuplint/selector';

export type Config = {
	readonly $schema?: string;
	readonly ruleCommonSettings?: RuleCommonSettings;
	readonly extends?: string | readonly string[];
	readonly plugins?: readonly (PluginConfig | string)[];
	readonly parser?: ParserConfig;
	readonly parserOptions?: ParserOptions;
	readonly specs?: SpecConfig;
	readonly excludeFiles?: readonly string[];
	readonly severity?: SeverityOptions;
	readonly pretenders?: readonly Pretender[] | PretenderDetails;
	readonly rules?: Rules;
	readonly nodeRules?: readonly NodeRule[];
	readonly childNodeRules?: readonly ChildNodeRule[];
	readonly overrideMode?: 'merge' | 'reset';
	readonly overrides?: Readonly<Record<string, OverrideConfig>>;
};

export type RuleCommonSettings = {
	readonly ariaVersion?: ARIAVersion;
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

type NoInherit = '$schema' | 'extends' | 'overrideMode' | 'overrides';

export type OverrideConfig = Omit<Config, NoInherit>;

export type OptimizedConfig = Omit<Config, '$schema' | 'extends' | 'plugins' | 'pretenders' | 'overrides'> & {
	readonly extends?: readonly string[];
	readonly plugins?: readonly PluginConfig[];
	readonly pretenders?: PretenderDetails;
	readonly overrides?: Readonly<Record<string, OptimizedOverrideConfig>>;
};

export type OptimizedOverrideConfig = Omit<OptimizedConfig, NoInherit>;

export type PluginConfig = {
	readonly name: string;
	readonly settings?: Readonly<Record<string, NonNullablePlainData>>;
};

export type ParserConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

export type SpecConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

export type SeverityOptions = {
	readonly parseError?: Severity | 'off' | boolean;
};

export type PretenderDetails = {
	/**
	 * @experimental
	 */
	readonly files?: readonly string[];

	/**
	 * @experimental
	 */
	readonly imports?: readonly string[];
	readonly data?: readonly Pretender[];
};

export type PretenderFileData = {
	readonly version: string;
	readonly data: readonly Pretender[];
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

	/**
	 * If it is a string, it is resolved as an element name.
	 * An element regards as having the same attributes
	 * as the pretended custom element because these are inherited.
	 * If it is an Object, It can specify in detail the element's attributes.
	 *
	 * @experimental
	 */
	readonly filePath?: string;

	/**
	 * Dynamic scaning
	 *
	 * @experimental
	 */
	readonly scan?: readonly PretenderScanConfig[];
};

export type OriginalNode = {
	/**
	 * Element name
	 */
	readonly element: string;

	/**
	 * It should specify slots if the component can define a slot element or children.
	 *
	 * For example, the following:
	 *
	 * ```jsx
	 * const Component = ({children}) => (
	 *   <div>
	 *     <h2>lorem ipsum</h2>
	 *     <p>{children}</p>
	 *   </div>
	 * );
	 * ```
	 *
	 * In the above case, the `p` element has the `children`,
	 * so it specifies the element to this field.
	 *
	 * Or:
	 *
	 * ```html
	 * <template>
	 *   <h2>lorem ipsum</h2>
	 *   <p><span slot="my-text">{children}</span></p>
	 * </template>
	 * ```
	 *
	 * It notes that what needs to be specified
	 * in this field is not the element with the slot attribute
	 * but the element that wraps it.
	 *
	 * This field accepts an array
	 * because a component and a custom element can have multiple slots.
	 *
	 * If `null`,
	 * it means the component **doesn't accept children or doesn't have slots**.
	 *
	 * ```jsx
	 * const Component = (props) => (
	 *   <img {...props} />
	 * );
	 * ```
	 *
	 * If true, it means the component accepts children or has slots,
	 * and **the wrapper element and the outermost element are the same**.
	 *
	 * ```jsx
	 * const Component = ({children}) => (
	 *   <button>{children}</button>
	 * );
	 * ```
	 *
	 * @experimental
	 */
	readonly slots?: null | true | readonly Slot[];

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
	readonly attrs?: readonly PretenderAttr[];

	/**
	 * To have attributes the defined element has.
	 */
	readonly inheritAttrs?: boolean;

	/**
	 * ARIA properties
	 */
	readonly aria?: PretenderARIA;
};

/**
 * @experimental
 */
export type Slot = Omit<OriginalNode, 'slot'>;

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

/**
 * @experimental
 */
export type PretenderScanConfig = {
	/**
	 * Supporting for Glob format
	 */
	readonly files: string;
	readonly type: string;
	readonly options: PretenderScanOptions;
};

/**
 * @experimental
 */
export interface PretenderScanOptions {
	readonly cwd?: string;
	readonly ignoreComponentNames?: readonly string[];
}

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
