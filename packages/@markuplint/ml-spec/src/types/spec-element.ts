/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- these interfaces describe mutable DOM objects */

import type { AccnameElement } from '../algorithm/aria/accname/types.js';

/**
 * An attribute as the algorithms of this package read it.
 */
export interface SpecAttr {
	readonly localName: string;
	/**
	 * `true` when the framework does not output the attribute (`disabled={false}`): a lookup by name
	 * does not find it, though it is still one of the element's `attributes`. Only MLDOM has it.
	 */
	readonly isAbsent?: boolean;
}

/**
 * The root of the tree of an element (a document, a document fragment, or a shadow root), as the
 * algorithms read it.
 */
export interface SpecRoot {
	readonly nodeType: number;
	findElementById?(id: string): SpecElement | null;
}

/**
 * What the algorithms of this package (roles, ARIA properties, content models, the accessible name)
 * read of an element. `MLElement` of `@markuplint/ml-core` is the only implementation.
 */
export interface SpecElement extends AccnameElement {
	readonly nodeName: string;
	readonly attributes: Iterable<SpecAttr>;
	readonly parentElement: SpecElement | null;
	readonly childElements: Iterable<SpecElement>;
	matches(selectors: string): boolean;
	getRootNode(): SpecRoot;
	/**
	 * The slot that places the element in the flat tree: `null` for an element of a shadow host that no
	 * slot takes (not rendered), `undefined` for an element that is not one or whose assignment is not known.
	 */
	getFlatTreeSlot(): SpecElement | null | undefined;
}
