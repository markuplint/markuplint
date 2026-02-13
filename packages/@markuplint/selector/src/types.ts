/**
 * Minimal attribute representation for selector matching.
 * Pure data — no methods, no class instances.
 *
 * In Rust this maps directly to a struct.
 */
export interface SelectorAttr {
	readonly name: string;
	readonly localName: string;
	readonly value: string;
	readonly namespaceURI: string | null;
}

/**
 * Minimal node representation for selector matching.
 * Pure data with tree-navigation references.
 *
 * In Rust this maps to a trait backed by arena indices.
 */
export interface SelectorNode {
	readonly nodeType: number;
	readonly nodeName: string;
	readonly parentNode: SelectorNode | null;
}

/**
 * Minimal element representation for CSS selector matching.
 * Captures **only** the properties the selector engine actually reads.
 *
 * DOM `Element` and `MLElement` both satisfy this interface,
 * but plain objects can satisfy it too — enabling Rust interop
 * and unit-testing without a full DOM.
 *
 * In Rust this maps to a struct + trait.
 */
export interface SelectorElement extends SelectorNode {
	readonly localName: string;
	readonly id: string;
	readonly namespaceURI: string | null;
	readonly classList: { contains(className: string): boolean };
	readonly attributes: Iterable<SelectorAttr>;
	readonly parentElement: SelectorElement | null;
	readonly previousElementSibling: SelectorElement | null;
	readonly nextElementSibling: SelectorElement | null;
	readonly children: Iterable<SelectorElement>;
}

/**
 * A CSS specificity tuple: `[id, class, type]`.
 * Each component counts selectors of the corresponding category.
 */
export type Specificity = readonly [number, number, number];

/**
 * The result of evaluating a parsed selector against a node.
 */
export type SelectorResult = SelectorMatchedResult | SelectorUnmatchedResult;

/**
 * A successful selector match result, including the specificity,
 * the matched nodes, and any `:has()` sub-match results.
 */
export type SelectorMatchedResult = {
	/** The computed specificity of the matched selector */
	readonly specificity: Specificity;
	readonly matched: true;
	/** The elements that were matched */
	readonly nodes: readonly SelectorElement[];
	/** Results from `:has()` pseudo-class sub-matches */
	readonly has: readonly SelectorMatchedResult[];
};

/**
 * An unsuccessful selector match result.
 */
export type SelectorUnmatchedResult = {
	/** The computed specificity of the unmatched selector */
	readonly specificity: Specificity;
	readonly matched: false;
	/** Results from `:not()` pseudo-class sub-matches that did match */
	readonly not?: readonly SelectorMatchedResult[];
};

/**
 * A regex-based selector that matches elements by node name and/or attribute
 * patterns using regular expressions. Supports combinators for chained matching.
 */
export type RegexSelector = RegexSelectorWithoutCombination & {
	/** An optional chained selector with a combinator */
	readonly combination?: {
		readonly combinator: RegexSelectorCombinator;
	} & RegexSelector;
};

/**
 * CSS combinator types supported by regex selectors.
 *
 * - `' '`      – Descendant combinator
 * - `'>'`      – Child combinator
 * - `'+'`      – Next-sibling combinator
 * - `'~'`      – Subsequent-sibling combinator
 * - `':has(+)'`– Previous-sibling combinator (via `:has()`)
 * - `':has(~)'`– Previous subsequent-sibling combinator (via `:has()`)
 */
export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)';

/**
 * The non-combinatorial part of a regex selector.
 * Matches against the element's node name, attribute name, and/or attribute value
 * using regular expression patterns.
 */
export type RegexSelectorWithoutCombination = {
	/** Regex pattern to match against the element's local name */
	readonly nodeName?: string;
	/** Regex pattern to match against attribute names */
	readonly attrName?: string;
	/** Regex pattern to match against attribute values */
	readonly attrValue?: string;
};
