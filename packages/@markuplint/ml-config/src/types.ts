import type { MLASTParseErrorCode, ParserOptions } from '@markuplint/ml-ast';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { RegexSelector } from '@markuplint/selector';
import type { Nullable } from '@markuplint/shared';

export type { RegexSelector } from '@markuplint/selector';

/**
 * The root configuration object for markuplint.
 * Defines rules, parsers, specs, plugins, and overrides for linting markup.
 *
 * @see https://markuplint.dev/configuration
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
	/**
	 * Computed by {@link mergeConfig} — never authored in a config file. Tracks
	 * `rules` keys that were a genuine {@link NamedRuleGroup} in some layer of the
	 * `extends`/override chain, even where the final merged value collapsed to
	 * `false` (a whole-group disable erases which base rule(s) it wrapped — see
	 * `mergeNamedRuleGroupEntry`). Consumers (`@markuplint/ml-core`) use this to
	 * tell an intentional named-group disable apart from a typo'd/nonexistent
	 * rule name that also happens to be set to `false` with a `/` in its key —
	 * both collapse to the same `rules[key] === false` shape after merging, but
	 * only the former should be exempt from "Rule not found" validation.
	 */
	readonly knownNamedRuleGroupKeys?: readonly string[];
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
	/**
	 * Severity for non-fatal parser conformance errors surfaced via the
	 * built-in `parse-error` channel.
	 *
	 * Accepts either of:
	 *
	 * - A single severity (`'error' | 'warning' | 'info' | 'off' | boolean`)
	 *   applied uniformly to **every** parser error code.
	 * - A {@link Partial} record keyed by {@link MLASTParseErrorCode}; codes
	 *   not present in the record fall through to `'off'`.
	 *
	 * **Default**: all codes off. The channel emits nothing until the user
	 * either flips this option to a single severity or opts specific codes in
	 * via the record form. This preserves backwards compatibility for users
	 * upgrading from versions where the channel did not exist.
	 *
	 * @example single severity (legacy form)
	 * ```jsonc
	 * { "severity": { "parseError": "error" } }
	 * ```
	 *
	 * @example per-code opt-in (recommended)
	 * ```jsonc
	 * {
	 *   "severity": {
	 *     "parseError": {
	 *       "duplicate-attribute": "error",
	 *       "unknown-named-character-reference": "warning"
	 *     }
	 *   }
	 * }
	 * ```
	 */
	readonly parseError?: ParseErrorSeverity | Partial<Record<MLASTParseErrorCode, ParseErrorSeverity>>;

	/**
	 * Severity for deprecated-rule-name notices, surfaced via the built-in
	 * `rule-deprecation` channel. A deprecated name is one the v5
	 * rule-system redesign (#3989) renamed or split; the notice reports that
	 * the config still works today but will stop resolving in v6.
	 *
	 * Unlike {@link parseError}, this defaults to `'warning'` (not off) —
	 * it carves an already-surfaced notice out of the generic `config-error`
	 * channel rather than introducing a new one, so leaving it unset must
	 * not silence something users already see.
	 *
	 * @example
	 * ```jsonc
	 * { "severity": { "deprecation": "off" } }
	 * ```
	 */
	readonly deprecation?: Severity | 'off' | boolean;
};

/**
 * Severity values accepted by {@link SeverityOptions.parseError}, in both
 * the uniform-severity and per-code forms.
 */
export type ParseErrorSeverity = Severity | 'off' | boolean;

/**
 * Normalized form of pretender configuration used after merging.
 * Contains optional file references, import paths, inline pretender data,
 * and dynamic scanning configuration.
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

	/**
	 * Inline pretender definitions.
	 */
	readonly data?: readonly Pretender[];

	/**
	 * Dynamic scanning configuration. Each entry specifies a glob pattern
	 * for component files to scan. File extensions determine the scanner:
	 * `.js/.jsx/.ts/.tsx` use the JSX scanner, `.vue/.svelte/.astro` use
	 * the template scanner.
	 *
	 * @experimental
	 */
	readonly scan?: readonly PretenderScanConfig[];

	/**
	 * When `true` (or an object), resolves pretenders on demand by scanning
	 * the lint target's own import graph instead of requiring `files`/`scan`
	 * pre-configuration. Because only the config file is filesystem-watched,
	 * results can go stale in watch mode / editor sessions if an imported
	 * component file changes without the config changing too.
	 *
	 * The object form tunes the walk ({@link PretenderAutoOptions}); `true`
	 * and `{}` use the defaults. When configs are merged, the right side
	 * replaces this value as a whole (the two forms are never combined).
	 *
	 * @experimental
	 */
	readonly auto?: boolean | PretenderAutoOptions;
};

/**
 * Options of the object form of {@link PretenderDetails.auto}.
 *
 * @experimental
 */
export type PretenderAutoOptions = {
	/**
	 * How many import hops from the linted file are followed. `0` considers
	 * only the linted file itself. Defaults to `8`.
	 *
	 * Must be a non-negative integer; `config.schema.json` enforces it, but a
	 * config handed over the API directly is not validated: a negative number
	 * or `NaN` behaves like `0`, and a fraction is rounded up.
	 */
	readonly depth?: number;
};

/**
 * Data structure for a pretender definition file.
 */
export type PretenderFileData = {
	/**
	 * Schema version of the pretender file format.
	 */
	readonly version: string;

	/**
	 * Array of pretender definitions in this file.
	 */
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
	 * Where the component was found, as `<path>:<line>:<column>`. Metadata only —
	 * nothing in linting reads it to influence pretender matching (matching is by
	 * `selector` alone). `@markuplint/pretenders` scanners emit `<path>` relative
	 * to the JSON file this entry will be written into, not the scan-time cwd, so
	 * it stays resolvable regardless of where the file is later loaded from.
	 *
	 * @experimental
	 */
	readonly filePath?: string;
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
	 * At the usage site, the children given to the component are evaluated
	 * against the content model of the element that wraps the slot:
	 *
	 * - `true` or omitted: the outermost element (`element`).
	 * - An array with exactly one {@link Slot}: that slot's `element`.
	 * - An array with two or more slots: the children are not validated,
	 *   because the wrapper each child belongs to is unknown.
	 * - `null`: there is no slot position, so {@link OriginalNode.contents}
	 *   is the whole content and given children are appended after it.
	 *   The accessible name computation does not use the given children,
	 *   because the component does not render them.
	 *
	 * @experimental
	 */
	readonly slots?: null | true | readonly Slot[];

	/**
	 * The static direct children of the element that wraps the slot
	 * (the outermost element when `slots` is `true` or `null`,
	 * otherwise each {@link Slot}), in document order.
	 *
	 * Permitted-content style rules evaluate the children at the usage site as
	 * this list with the given children substituted for the `{ slot: true }` entry.
	 * That is what lets `<details>{children}</details>` still require a `summary`
	 * while `<picture>{children}<img /></picture>` does not report a missing `img`.
	 *
	 * When omitted, the given children are the whole content.
	 *
	 * Known limitation: `permitted-contents`, `require-owned-elements` and the accessible
	 * name computation (name from content, `legend`, `caption`, and label text) read it. Other rules that
	 * look at the children of the element, and the `title` of an SVG and the `option`s
	 * of a `select` in the name computation, still see only the children given at the
	 * usage site. In the name computation, `{ dynamic: true }` is not a source of
	 * a name, so a component that renders only an expression is unnamed;
	 * `require-accessible-name` does not report it because the expression may
	 * be the name.
	 *
	 * @experimental
	 */
	readonly contents?: readonly PretenderContent[];

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
export type Slot = Omit<OriginalNode, 'slots'>;

/**
 * A static direct child of the element that wraps the slot.
 *
 * @experimental
 */
export type PretenderContent =
	| {
			/**
			 * A native element that the component always renders there.
			 */
			readonly element: string;
			readonly attrs?: readonly PretenderAttr[];
	  }
	| {
			/**
			 * The position where the children given at the usage site are placed.
			 */
			readonly slot: true;
	  }
	| {
			/**
			 * Something rendered there whose content is unknown at scan time
			 * (an expression, a conditional, another component, and so on).
			 * Required-content checks are skipped for the pretender.
			 */
			readonly dynamic: true;
	  };

export type PretenderAttr = {
	/**
	 * Attribute name
	 */
	readonly name: string;

	/**
	 * If it omits this property, the attribute is resolved as a boolean.
	 *
	 * `{ dynamic: true }` means the attribute is present but its value is
	 * unknown at scan time (e.g. `tabIndex={selected ? 0 : -1}`);
	 * rules treat it as a dynamic value and do not validate it.
	 *
	 * `{ fromAttr }` takes the value of the attribute the component has at the usage site.
	 * If that attribute is an expression (`<Button kind={kind} />`), the result is dynamic
	 * too. With `omitIfMissing`, the element has no such attribute when the usage site does
	 * not write it, which is what a component that forwards an optional prop renders
	 * (`<button type={kind}>` omits `type` when `kind` is `undefined`); without it, the
	 * attribute is present and empty.
	 */
	readonly value?:
		| string
		| {
				readonly fromAttr: string;
				readonly omitIfMissing?: true;
		  }
		| {
				readonly dynamic: true;
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
 * Configuration for dynamic component scanning.
 * File extensions determine the scanner automatically:
 * `.js/.jsx/.ts/.tsx` → JSX scanner, `.vue/.svelte/.astro` → template scanner.
 *
 * @experimental
 */
export type PretenderScanConfig = {
	/**
	 * Glob pattern(s) for component files to scan.
	 */
	readonly files: string | readonly string[];

	/**
	 * Component names to exclude from scanning results.
	 */
	readonly ignoreComponentNames?: readonly string[];
};

/**
 * Base options for pretender scanners.
 *
 * @experimental
 */
export interface PretenderScanOptions {
	/**
	 * Working directory for resolving relative file paths.
	 */
	readonly cwd?: string;

	/**
	 * Component names to exclude from scanning results.
	 */
	readonly ignoreComponentNames?: readonly string[];

	/**
	 * In-memory content overrides, keyed by normalized (`/`-delimited)
	 * absolute file path, consulted before falling back to a disk read.
	 * For content with no on-disk source of truth yet, such as an editor's
	 * unsaved buffer for the file currently being linted.
	 */
	readonly sources?: ReadonlyMap<string, string>;

	/**
	 * A sink the scan adds to: the normalized (`/`-delimited) absolute paths
	 * of the files whose content its result depends on. A watch-mode host
	 * watches them to learn when to scan again (#4065).
	 *
	 * Recorded: the files given to the scan; the source files the TypeScript
	 * program reaches from them through relative imports (it follows none
	 * under `autoScan`, which has collected the files itself, within its
	 * depth); the files read to resolve an imported component (barrels and the
	 * files they re-export from); and the `tsconfig.json` the imports were
	 * resolved with, with the configs it `extends`.
	 *
	 * Not recorded — a change to these is picked up only by a later full
	 * resolution of the config:
	 *
	 * - Declaration files, and anything under `node_modules`
	 *   (`package.json` `exports` included).
	 * - Files that do not exist yet: a candidate of an import specifier, a
	 *   nearer `tsconfig.json`, a new file matching a `scan` glob. A file that
	 *   was removed and comes back is one of them: once the result no longer
	 *   reads it, it is no longer reported.
	 * - Files that a plain `scan()` could reach only through a `paths` alias —
	 *   the TypeScript program the JSX scanner builds reads no `tsconfig.json`
	 *   and follows relative imports only (`autoScan` resolves aliases itself).
	 *
	 * The scan only adds; the caller owns the set.
	 */
	readonly dependencies?: Set<string>;
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
 * A named rule group in the `rules` section.
 * Keys containing `/` in `rules` are treated as named rule groups.
 * Each group wraps one or more base rules under a namespace,
 * enabling per-check control and spec conformance metadata.
 *
 * @example
 * ```jsonc
 * {
 *   "rules": {
 *     "a11y/id-duplication": {
 *       "specConformance": "normative",
 *       "rules": { "id-duplication": true }
 *     }
 *   }
 * }
 * ```
 */
export type NamedRuleGroup = {
	readonly specConformance?: SpecConformance;
	/** User-applied severity override for all rules in the group */
	readonly severity?: Severity;
	readonly rules: BaseRules;
};

/**
 * A dictionary mapping base rule names to their configurations.
 * Does not accept {@link NamedRuleGroup} entries.
 * Used inside {@link NamedRuleGroup}, {@link NodeRule}, and {@link ChildNodeRule}.
 */
export type BaseRules = {
	readonly [ruleName: string]: AnyRule;
};

/**
 * A dictionary mapping rule names to their configurations.
 * Keys containing `/` may be {@link NamedRuleGroup} entries.
 */
export type Rules = {
	readonly [ruleName: string]: AnyRule | NamedRuleGroup;
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
	/** When `true`, replaces the violation message with `reason` entirely instead of appending it. Requires `reason` to be set. */
	readonly reasonOnly?: boolean;
};

/**
 * The severity level of a lint violation.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * The spec conformance classification of a rule, based on RFC 2119 keyword strength.
 *
 * - `'normative'` — derived from MUST/REQUIRED requirements in the HTML spec
 * - `'non-normative'` — derived from SHOULD/RECOMMENDED requirements in the HTML spec
 * - `undefined` — plugin/preset recommendation or user-defined (no spec backing)
 */
export type SpecConformance = 'normative' | 'non-normative';

/**
 * The value portion of a rule configuration. Can be a primitive scalar,
 * an array of scalars or objects, or `null` to represent no value.
 */
export type RuleConfigValue = PrimitiveScalar | readonly (PrimitiveScalar | Readonly<Record<string, any>>)[] | null;

/**
 * A rule override that targets specific nodes by CSS selector, regex selector, ARIA roles, or categories.
 *
 * When a `name` is provided (must contain `/`), this becomes a **named nodeRule**
 * that creates a virtual rule instance running independently from the base rule.
 * Named nodeRules can be individually enabled/disabled via `rules["name/here"]: false`.
 */
export type NodeRule = {
	/**
	 * Alias name for this nodeRule, creating a virtual rule.
	 * Must contain `/` (e.g., `"a11y/img-has-alt"`).
	 * With a single non-false entry, this name is used directly.
	 * With multiple non-false entries, derived names (`name/baseRuleName`)
	 * are generated automatically, and this name becomes the group name.
	 */
	readonly name?: string;
	/**
	 * The spec conformance classification of this rule.
	 * Included in violations as metadata for downstream tools and reporting.
	 */
	readonly specConformance?: SpecConformance;
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly categories?: readonly string[];
	readonly roles?: readonly string[];
	readonly obsolete?: boolean;
	/** Base rule settings. Does not accept {@link NamedRuleGroup} entries. */
	readonly rules?: BaseRules;
};

/**
 * A rule override that targets child nodes of elements matching the selector.
 *
 * When a `name` is provided (must contain `/`), this becomes a **named childNodeRule**
 * that creates a virtual rule instance, just like named nodeRules.
 */
export type ChildNodeRule = {
	/**
	 * Alias name for this childNodeRule, creating a virtual rule.
	 * Must contain `/` (e.g., `"a11y/heading-in-section"`).
	 * With a single non-false entry, this name is used directly.
	 * With multiple non-false entries, derived names (`name/baseRuleName`)
	 * are generated automatically, and this name becomes the group name.
	 */
	readonly name?: string;
	/**
	 * The spec conformance classification of this rule.
	 * Included in violations as metadata for downstream tools and reporting.
	 */
	readonly specConformance?: SpecConformance;
	readonly selector?: string;
	readonly regexSelector?: RegexSelector;
	readonly inheritance?: boolean;
	/** Base rule settings. Does not accept {@link NamedRuleGroup} entries. */
	readonly rules?: BaseRules;
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
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	readonly fix?: (fixer: IRuleFixer) => TextEdit | readonly TextEdit[];
};

/**
 * A coordinate-based violation report with explicit line, column, and raw text.
 */
export type Report2 = {
	readonly message: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	readonly fix?: (fixer: IRuleFixer) => TextEdit | readonly TextEdit[];
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
 * A text range replacement on the source code.
 * Used by the autofix system to describe edits.
 */
export type TextEdit = {
	/** 0-based character offsets (UTF-16 code units): [start, end) */
	readonly range: readonly [start: number, end: number];
	/** Replacement text (empty string = deletion) */
	readonly text: string;
};

/**
 * Fix information attached to a {@link Violation}.
 * Contains one or more {@link TextEdit}s to apply to the source.
 */
export type FixData = {
	readonly edits: readonly TextEdit[];
};

/**
 * Minimal token shape required by {@link IRuleFixer} methods.
 * Any object with a character offset and raw source text satisfies this constraint.
 */
export type FixToken = {
	readonly startOffset: number;
	readonly raw: string;
};

/**
 * A helper interface for building {@link TextEdit}s inside a fix callback.
 * Passed to the `fix` function on {@link Report1} and {@link Report2}.
 */
export interface IRuleFixer {
	/**
	 * Replaces a token's entire text with new content.
	 *
	 * @param token - The token whose range will be replaced
	 * @param text - The replacement text
	 * @returns A TextEdit spanning the token's range
	 */
	replaceText(token: FixToken, text: string): TextEdit;

	/**
	 * Replaces an explicit character range with new content.
	 *
	 * @param range - The `[start, end)` character offsets to replace
	 * @param text - The replacement text
	 * @returns A TextEdit spanning the given range
	 */
	replaceRange(range: readonly [number, number], text: string): TextEdit;

	/**
	 * Inserts text immediately before a token.
	 *
	 * @param token - The token before which to insert
	 * @param text - The text to insert
	 * @returns A zero-width TextEdit at the token's start offset
	 */
	insertBefore(token: Pick<FixToken, 'startOffset'>, text: string): TextEdit;

	/**
	 * Inserts text immediately after a token.
	 *
	 * @param token - The token after which to insert
	 * @param text - The text to insert
	 * @returns A zero-width TextEdit at the token's end offset
	 */
	insertAfter(token: FixToken, text: string): TextEdit;

	/**
	 * Removes a token's entire text from the source.
	 *
	 * @param token - The token to remove
	 * @returns A TextEdit that replaces the token's range with an empty string
	 */
	remove(token: FixToken): TextEdit;

	/**
	 * Removes an explicit character range from the source.
	 *
	 * @param range - The `[start, end)` character offsets to remove
	 * @returns A TextEdit that replaces the range with an empty string
	 */
	removeRange(range: readonly [number, number]): TextEdit;
}

/**
 * A fully resolved lint violation with all information needed for reporting.
 */
export type Violation = {
	/** The base rule ID (always the underlying rule name, for backwards compatibility) */
	readonly ruleId: string;
	/**
	 * The display name of the rule. Present only on virtual rules (named nodeRules).
	 * For regular rules, use `ruleId` as the display name.
	 */
	readonly name?: string;
	readonly severity: Severity;
	readonly message: string;
	readonly reason?: string;
	/** The normative level of the rule that produced this violation */
	readonly specConformance?: SpecConformance;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
	/** Fix information for autofix. Present only when the rule provides a fix callback. */
	readonly fix?: FixData;
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
	readonly reasonOnly?: boolean;
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
