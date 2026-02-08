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
	/** The DOM nodes that were matched */
	readonly nodes: readonly (Element | Text)[];
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
