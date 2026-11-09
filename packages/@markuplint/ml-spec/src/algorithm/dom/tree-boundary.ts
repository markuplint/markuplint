/**
 * @module
 *
 * The parent of an element as the DOM sees it, for the algorithms that walk up from an element.
 *
 * The algorithms of this package are written against the DOM `Element`, where `parentElement`
 * stops at the boundary of a tree: the parent element of a node whose parent is not an element
 * (a document fragment, such as the content of a `template` element or a shadow root) is `null`.
 * `@markuplint/ml-core` hands them its own elements, whose `parentElement` is the syntactical
 * parent: the syntax tree has no other place for the content of a `template` element than its
 * children, so the top of the content has the `template` element as its parent element. A walk
 * that reads `parentElement` there leaves the content and enters the tree that holds the
 * `template`. `getRootNode()` is where `@markuplint/ml-core` puts the boundary, and in a real DOM
 * a parent is always in the tree of its child, so comparing the two roots gives the DOM's answer
 * to both.
 *
 * This package cannot use `MLNode#treeParentElement` of `@markuplint/ml-core`, which depends on it,
 * so the helpers derive the same answer from `getRootNode()`. The two are pinned to agree by
 * `tree-scope.spec.ts` of `@markuplint/ml-core`: a change to the boundary in one belongs to both.
 *
 * Which of the two helpers a walk takes depends on what it follows:
 *
 * - {@link getTreeParentElement} follows a relation that the DOM defines in the tree, such as
 *   the ancestor `label` element of a labelable element (`findAncestorLabel`, the one walk of
 *   this package that does not follow the accessibility tree).
 * - {@link getComposedParentElement} follows what the accessibility tree is built from. Its
 *   content is the flat tree: the content of a shadow root is rendered in its host, so the
 *   elements above it are the host and the ancestors of the host. The content of an ordinary
 *   `template` element is not rendered, and where it is inserted is not known from the markup,
 *   so a walk ends at its top.
 *
 * A `template` element that may have a declarative shadow root but whose attachment is not known
 * from the markup (a host that is not in the file, a component, or a dynamic `shadowrootmode`),
 * or that fails to attach one, is treated as an ordinary `template` element: a walk ends at the
 * top of its content.
 *
 * Known limitation: the flat tree places the content of a shadow root where the `slot` element
 * is, between the host and the nodes the host has as children. A walk goes from the top of the
 * shadow root to the host and does not model the position of the `slot`.
 *
 * @see https://dom.spec.whatwg.org/#concept-tree-parent-element
 * @see https://dom.spec.whatwg.org/#concept-shadow-including-ancestor
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */

/** DOM `Node.DOCUMENT_FRAGMENT_NODE` */
const DOCUMENT_FRAGMENT_NODE = 11;

/**
 * What the helpers read of an element: the DOM `Element`, and `MLElement` of `@markuplint/ml-core`.
 * An element without `getRootNode` (an adapter that has no notion of a tree boundary) is in one
 * tree with its parent element.
 */
type TreeElement = {
	readonly parentElement: unknown;
	getRootNode?(): unknown;
};

/**
 * The parent element of an element in its own tree, which is what the DOM calls `parentElement`:
 * `null` at the top of the content of a `template` element or of a shadow root, even where the
 * `parentElement` of the element implementation is the `template` element.
 *
 * @template P - The type of the parent element the element reads
 * @param el - The element to start from
 * @returns The parent element, or `null` when the element is at the top of its tree
 */
export function getTreeParentElement<P extends TreeElement>(el: {
	readonly parentElement: P | null;
	getRootNode?(): unknown;
}): P | null {
	const parent = el.parentElement;
	if (!parent) {
		return null;
	}
	// Without a tree on either side there is no boundary between them
	if (!parent.getRootNode || !el.getRootNode) {
		return parent;
	}
	return parent.getRootNode() === el.getRootNode() ? parent : null;
}

/**
 * The parent element of an element as the accessibility tree is built: the parent element in its own
 * tree, or, at the top of a shadow root, the host of the shadow root. `null` at the top of the content
 * of an ordinary `template` element, and at the top of a document or of any other root that is not a
 * shadow root.
 *
 * @template P - The type of the parent element the element reads
 * @param el - The element to start from
 * @returns The parent element or the shadow host, or `null` when the walk ends
 */
export function getComposedParentElement<P extends TreeElement>(el: {
	readonly parentElement: P | null;
	getRootNode?(): unknown;
}): P | null {
	const parent = getTreeParentElement(el);
	if (parent) {
		return parent;
	}
	const root = el.getRootNode?.();
	if (isShadowRoot<P>(root)) {
		return root.host;
	}
	return null;
}

/**
 * Whether a root is a shadow root: a document fragment that has a host.
 * The shadow root of `@markuplint/ml-core` is not a `ShadowRoot` of the DOM by class, and the
 * content of an ordinary `template` element is a document fragment that has no host.
 *
 * @template P - The type of the host
 * @param root - The root of a tree
 * @returns `true` if the root has a host element
 */
export function isShadowRoot<P = unknown>(root: unknown): root is { readonly host: P } {
	return (
		typeof root === 'object' &&
		root !== null &&
		'nodeType' in root &&
		root.nodeType === DOCUMENT_FRAGMENT_NODE &&
		'host' in root
	);
}
