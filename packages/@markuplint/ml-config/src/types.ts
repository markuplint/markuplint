import type { ParserOptions } from '@markuplint/ml-ast';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { RegexSelector } from '@markuplint/selector';
import type { Nullable } from '@markuplint/shared';

export type { RegexSelector } from '@markuplint/selector';

/**
 * The root configuration object for markuplint.
 * Defines rules, parsers, specs, plugins, and overrides for linting markup.
 */
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

/**
 * Common settings applied globally to all rules.
 * These values serve as fallbacks when individual rules do not specify their own.
 */
export type RuleCommonSettings = {
	readonly ariaVersion?: ARIAVersion;
};

/**
 * A primitive scalar value that can appear in rule configuration.
 */
export type PrimitiveScalar = string | number | boolean;

/**
 * A JSON-compatible data structure used for rule options and plugin settings.
 * Can be a primitive, null/undefined, an array of `PlainData`, or a plain object.
 */
export type PlainData =
	| Nullable<PrimitiveScalar>
	| readonly PlainData[]
	| {
			readonly [key: string]: PlainData | any;
	  };

/**
 * A non-nullable variant of {@link PlainData}, excluding `null` and `undefined`.
 */
export type NonNullablePlainData =
	| PrimitiveScalar
	| readonly NonNullablePlainData[]
	| {
			readonly [key: string]: NonNullablePlainData;
	  };

type NoInherit = '$schema' | 'extends' | 'overrideMode' | 'overrides';

/**
 * Configuration applied to specific file patterns via the `overrides` field.
 * Excludes top-level-only properties like `$schema`, `extends`, `overrideMode`, and `overrides`.
 */
export type OverrideConfig = Omit<Config, NoInherit>;

/**
 * A fully resolved and optimized configuration after merging.
 * Plugins are normalized to objects, and pretenders are converted to {@link PretenderDetails}.
 */
export type OptimizedConfig = Omit<Config, '$schema' | 'extends' | 'plugins' | 'pretenders' | 'overrides'> & {
	readonly extends?: readonly string[];
	readonly plugins?: readonly PluginConfig[];
	readonly pretenders?: PretenderDetails;
	readonly overrides?: Readonly<Record<string, OptimizedOverrideConfig>>;
};

/**
 * An optimized override configuration, excluding top-level-only properties.
 */
export type OptimizedOverrideConfig = Omit<OptimizedConfig, NoInherit>;

/**
 * Configuration for a single markuplint plugin.
 */
export type PluginConfig = {
	readonly name: string;
	readonly settings?: Readonly<Record<string, NonNullablePlainData>>;
};

/**
 * Maps file extension patterns to parser module names or paths.
 */
export type ParserConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

/**
 * Maps file extension patterns to spec module names or paths.
 */
export type SpecConfig = {
	readonly [extensionPattern: string]: string /* module name or path */;
};

/**
 * Options for controlling the severity of specific diagnostic categories.
 */
export type SeverityOptions = {
	readonly parseError?: Severity | 'off' | boolean;
};

/**
 * Normalized form of pretender configuration used after merging.
 * Contains optional file references, import paths, and inline pretender data.
 */
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

/**
 * Data structure for a pretender definition file.
 */
export type PretenderFileData = {
	readonly version: string;
	readonly data: readonly Pretender[];
};

/**
 * Defines a mapping from a custom element (matched by CSS selector) to a standard
 * HTML element for linting purposes, allowing rules to treat custom components
 * as if they were native elements.
 */
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

/**
 * A rule setting: either a full {@link RuleConfig} object, a direct value, or a boolean to enable/disable.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type Rule<T extends RuleConfigValue, O extends PlainData = undefined> = RuleConfig<T, O> | Readonly<T> | boolean;

/**
 * A rule setting with any value and option types.
 */
export type AnyRule = Rule<RuleConfigValue, PlainData>;

/**
 * A dictionary mapping rule names to their configurations.
 */
export type Rules = {
	readonly [ruleName: string]: AnyRule;
};

/**
 * Full configuration for a single rule, specifying severity, value, options, and reason.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type RuleConfig<T extends RuleConfigValue, O extends PlainData = undefined> = {
	/** The severity level for violations of this rule */
	readonly severity?: Severity;
	/** The rule's primary configuration value */
	readonly value?: Readonly<T>;
	/** Additional options for the rule */
	readonly options?: Readonly<O>;
	/** A human-readable reason for this rule configuration, included in violation messages */
	readonly reason?: string;
};

/**
 * The severity level of a lint violation.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * The value portion of a rule configuration. Can be a primitive scalar,
 * an array of scalars or objects, or `null` to represent no value.
 */
export type RuleConfigValue = PrimitiveScalar | readonly (PrimitiveScalar | Readonly<Record<string, any>>)[] | null;

/**
 * A rule override that targets specific nodes by CSS selector, regex selector, ARIA roles, or categories.
 */
export type NodeRule = {
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly categories?: readonly string[];
	readonly roles?: readonly string[];
	readonly obsolete?: boolean;
	readonly rules?: Rules;
};

/**
 * A rule override that targets child nodes of elements matching the selector.
 */
export type ChildNodeRule = {
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly inheritance?: boolean;
	readonly rules?: Rules;
};

/**
 * A violation report from a rule. Can report against a scope (node-based)
 * or against explicit line/column coordinates, or both.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type Report<T extends RuleConfigValue, O extends PlainData = undefined> =
	| Report1<T, O>
	| Report2
	| (Report1<T, O> & Report2);

/**
 * A scope-based violation report, referencing the rule info and position via a {@link Scope}.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type Report1<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly message: string;
	readonly scope: Scope<T, O>;
};

/**
 * A coordinate-based violation report with explicit line, column, and raw text.
 */
export type Report2 = {
	readonly message: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

/**
 * Identifies the location and rule context of a reported violation.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type Scope<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly rule: RuleInfo<T, O>;
	readonly startLine: number;
	readonly startCol: number;
	readonly raw: string;
};

/**
 * A fully resolved lint violation with all information needed for reporting.
 */
export type Violation = {
	readonly ruleId: string;
	readonly severity: Severity;
	readonly message: string;
	readonly reason?: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

/**
 * Resolved rule information after configuration merging, used at runtime by rules.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type RuleInfo<T extends RuleConfigValue, O extends PlainData = undefined> = {
	readonly disabled: boolean;
	readonly severity: Severity;
	readonly value: Readonly<T>;
	readonly options: Readonly<O>;
	readonly reason?: string;
};

/**
 * Extended rule information that includes node-level and child-node-level overrides.
 *
 * @template T - The type of the rule's value
 * @template O - The type of the rule's options
 */
export type GlobalRuleInfo<T extends RuleConfigValue, O extends PlainData = undefined> = RuleInfo<T, O> & {
	nodeRules: RuleInfo<T, O>[];
	childNodeRules: RuleInfo<T, O>[];
};
