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
	/**
	 * Whether the DOM makes this name the same attribute under another ASCII case: an attribute set
	 * on an HTML element is (`setAttribute` lower-cases the name), one on an SVG or MathML element is
	 * not, and neither is a prop of a component. Absent means the host does not say, and the element
	 * decides as it always did: only a pure HTML element folds (see `isPureHTMLElement`).
	 */
	readonly nameCaseInsensitive?: boolean;
	/**
	 * The name the attribute has in the DOM, which a selector is matched with: the HTML parser
	 * restores `viewBox` for `<svg VIEWBOX>`. Absent means `localName`.
	 */
	readonly domName?: string;
	/**
	 * Whether the framework makes the name of a selector the same prop as `domName` once it is
	 * camelized (Vue: `my-label` and `myLabel` are one prop). Absent means it does not.
	 */
	readonly nameIsCamelized?: boolean;
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
	/**
	 * Whether the `#custom` entry of a content model category (`:model(flow)` etc.) covers
	 * this element. Absent means it does not: a host without a notion of custom elements
	 * (a plain DOM) never matches `#custom`.
	 */
	readonly isCustomElement?: boolean;
	/**
	 * Whether the document this element is in tells the case of a tag name apart (JSX, Svelte, Astro
	 * and MDX do: `<foobar>` and `<FooBar>` are not the same element). A type selector, and the `nodeName`
	 * of a regular expression selector, are then compared with `localName` as it is, even for an element
	 * that HTML names case-insensitively. Absent means it does not: a plain DOM follows HTML.
	 */
	readonly tagNameCaseSensitive?: boolean;
	/**
	 * What the element is for a type selector, in a document that resolves a component by any
	 * spelling of its name (Vue: `<FooBar>`, `<fooBar>` and `<foo-bar>` are one component). Absent
	 * means the document does not, and the type selector is compared as `tagNameCaseSensitive` says.
	 *
	 * - `component`: a component, which `localName` names as written
	 * - `native`: an HTML element that has a specification (`<button>`)
	 * - `unknown-html`: an HTML element that has none (`<foobar>`)
	 *
	 * An element that a pretender stands for is what the pretender makes it, as `localName` is.
	 * An element of the SVG or MathML namespace has none: it keeps the case of its name.
	 */
	readonly tagNameKind?: 'component' | 'native' | 'unknown-html';
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
