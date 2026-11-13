/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

/**
 * Minimal node interface for accessible name computation.
 * `MLElement` of `@markuplint/ml-core` is the implementation.
 */
export interface AccnameNode {
	readonly nodeType: number;
	readonly textContent: string | null;
}

/**
 * Minimal element interface for accessible name computation.
 * `MLElement` satisfies this interface via structural typing.
 */
export interface AccnameElement extends AccnameNode {
	readonly nodeType: number;
	readonly localName: string;
	readonly id: string;
	readonly namespaceURI: string | null;
	getAttrValue(name: string): string | null;
	hasAttr(name: string): boolean;
	readonly parentElement: AccnameElement | null;
	/**
	 * The root of the tree of the element. An element and its parent element are in the same tree,
	 * unless the parent element is only the syntactical parent, as `MLElement#parentElement` is for the
	 * top of the content of a `template` element: see `getTreeParentElement`. An implementation without
	 * it has no tree boundary.
	 */
	getRootNode(): unknown;
	/**
	 * The slot that places the element in the flat tree: `null` when it is not rendered, `undefined` when
	 * it is not in a shadow host or the assignment is not known.
	 */
	getFlatTreeSlot(): AccnameElement | null | undefined;
	readonly childElements: Iterable<AccnameElement>;
	readonly childNodes: Iterable<AccnameNode>;
}

/**
 * Environment-dependent resolver for accessible name computation.
 *
 * Decouples the pure AccName algorithm (accname/) from DOM traversal
 * and role resolution. The implementation is in **ml-core**: an MLElement-based resolver that reads
 * the parsed MLDOM tree.
 */
export interface AccnameResolver {
	getElementById(id: string): AccnameElement | null;
	getLabelsForId(id: string): readonly AccnameElement[];
	allowsNameFromContent(el: AccnameElement): boolean;
	isHidden(el: AccnameElement): boolean;
	/**
	 * Checks if an element is an embedded control whose value should be used
	 * in name-from-content computation (textbox, combobox, listbox, spinbutton, slider, searchbox).
	 */
	isEmbeddedControl(el: AccnameElement): boolean;
	/**
	 * Checks if an element is exposed with an explicit `none` or `presentation`
	 * role, so that Step 2E does not use its host language text alternative.
	 * When absent, no element is treated so.
	 */
	isExposedAsPresentational?(el: AccnameElement): boolean;
	/**
	 * Called for every element the computation reaches, before Step 2A, so that
	 * a caller can tell which attributes of a descendant took part in a name.
	 * An element that the computation does not reach (the subtree of a hidden
	 * element, or of one named before content) is never reported.
	 */
	onVisit?(el: AccnameElement, visit: AccnameVisit): void;
	/**
	 * Returns a pre-computed name for an element, bypassing the standard algorithm.
	 * Used by ml-core for Pretender integration where framework components provide
	 * accessible names through configuration.
	 */
	getPrecomputedName?(el: AccnameElement): string | null;
	/**
	 * Returns the child nodes to traverse for `el`, in place of `el.childNodes`.
	 * Used by ml-core for a pretended component: it renders its own elements around
	 * the children given at the usage site (`contents` of the pretender), and those
	 * can carry the accessible name (`<button><img alt="Save"></button>`).
	 * Also the rendered children, when they are not the syntactical ones: the
	 * child nodes of an attached shadow root, and none for an ordinary
	 * `template` element, whose content is not rendered where it is written.
	 * An element whose shadow root is only maybe attached is given none as
	 * well, because that root is not there to read.
	 * Consulted by name-from-content, label text, the legend/caption/SVG `title`
	 * lookups, the `<select>` options, and wherever the computation reads an
	 * element's text (`getTextContent`): an option, an SVG `title`, the value of
	 * an embedded control. `hasSvgAccessibleNameSource` is the exception.
	 */
	getChildNodes?(el: AccnameElement): Iterable<AccnameNode>;
}

/**
 * The recursive entry of the computation (`computeAccessibleNameInternal`),
 * handed to the steps that compute the text alternative of another node.
 */
export type AccnameComputeFn = (
	el: AccnameElement,
	resolver: AccnameResolver,
	inLabelledbyTraversal: boolean,
	visited: ReadonlySet<string>,
) => AccnameResult;

/**
 * How the computation reached an element (see `AccnameResolver.onVisit`).
 */
export interface AccnameVisit {
	/**
	 * Whether Step 2A found the element hidden, which ends the computation of
	 * it. Step 2A does not apply inside an `aria-labelledby` traversal whose
	 * directly referenced node is hidden, so no element is found hidden there.
	 */
	readonly hidden: boolean;
	/**
	 * Whether the element is an embedded control reached by name-from-content
	 * recursion (Step 2C), whose value is used and whose `aria-label` is ignored.
	 */
	readonly embeddedControl: boolean;
	/**
	 * Whether the element is part of an ongoing `aria-labelledby` traversal, in
	 * which Step 2B is not applied.
	 */
	readonly inLabelledbyTraversal: boolean;
}

/**
 * Identifies the source of an element's accessible name per HTML-AAM §4.1.
 * Used for diagnostic purposes (e.g., reporting which source provided the name).
 */
export type AccnameSource =
	| 'aria-labelledby'
	| 'aria-label'
	| 'label'
	| 'alt'
	| 'content'
	| 'title'
	| 'placeholder'
	| 'value'
	| 'legend'
	| 'caption'
	| 'svg-title'
	| 'default';

/**
 * Result of accessible name computation, including the name string and its source.
 */
export interface AccnameResult {
	readonly name: string;
	readonly source: AccnameSource | null;
}

export interface AccnameOptions {
	readonly inLabelledbyTraversal?: boolean;
	readonly visited?: ReadonlySet<string>;
}
