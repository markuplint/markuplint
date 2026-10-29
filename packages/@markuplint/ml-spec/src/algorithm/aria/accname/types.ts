/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

/**
 * Minimal node interface for accessible name computation.
 * Structurally compatible with both DOM `Element` and `MLElement`,
 * enabling the AccName algorithm to run in both JSDOM (tests, accname-computation.ts)
 * and ml-core (MLElement-based lint rules) environments without adaptation.
 */
export interface AccnameNode {
	readonly nodeType: number;
	readonly textContent: string | null;
}

/**
 * Minimal element interface for accessible name computation.
 * MLElement satisfies this interface via structural typing (no adapter needed).
 */
export interface AccnameElement extends AccnameNode {
	readonly nodeType: number;
	readonly localName: string;
	readonly id: string;
	readonly namespaceURI: string | null;
	getAttribute(name: string): string | null;
	hasAttribute(name: string): boolean;
	readonly parentElement: AccnameElement | null;
	readonly children: Iterable<AccnameElement>;
	readonly childNodes: Iterable<AccnameNode>;
}

/**
 * Environment-dependent resolver for accessible name computation.
 *
 * Decouples the pure AccName algorithm (accname/) from DOM traversal
 * and role resolution. Two implementations exist:
 * - **accname-computation.ts**: DOM-based resolver using `document.getElementById`,
 *   `querySelectorAll`, and `getComputedRole` for JSDOM/browser environments.
 * - **ml-core**: MLElement-based resolver using the parsed MLDOM tree.
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
