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
	 * Consulted by name-from-content, label text, and the legend/caption lookups;
	 * the other lookups (SVG `title`, `<select>` options) still read the element itself.
	 */
	getChildNodes?(el: AccnameElement): Iterable<AccnameNode>;
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
