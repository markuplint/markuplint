import { XHTML_NAMESPACE } from '../../const/dom.js';

/**
 * @module
 *
 * The parent of an element as the DOM sees it, for the algorithms that walk up from an element.
 *
 * The algorithms of this package are written against the DOM `Element` model, where `parentElement`
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
 * The flat tree renders a light child of a shadow host where the `slot` element that takes it is,
 * so the parent of the child is that `slot`: `getFlatTreeSlot()` of `@markuplint/ml-core` tells it
 * (the named slot assignment of the shadow root). A child that no slot takes is not rendered, so a
 * walk ends there as it does at the top of the content of an ordinary `template` element. Where the
 * assignment is not known (`undefined`: manual assignment, a name written as code, a slot of a
 * framework), the walk goes to the host as it does for any other child. The `slot` element itself
 * is an element that is not mapped to the accessibility tree, which the algorithms of this package
 * pass through (`isSlotElement`).
 *
 * Known limitation: a walk from the top of the shadow root goes to the host and does not model where
 * the `slot` sits in the shadow root, so the elements of the shadow root that are above the `slot` are
 * not between the host and a light child the `slot` takes. The fallback content of a slot that takes
 * nodes is not rendered either, and a walk from it still goes through the `slot`.
 *
 * @see https://dom.spec.whatwg.org/#find-a-slot
 * @see https://dom.spec.whatwg.org/#find-flattened-slotables
 * @see https://dom.spec.whatwg.org/#parent-element
 * @see https://dom.spec.whatwg.org/#concept-shadow-including-ancestor
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */

/** DOM `Node.DOCUMENT_FRAGMENT_NODE` */
const DOCUMENT_FRAGMENT_NODE = 11;

/**
 * What the helpers read of an element: `SpecElement`, which `MLElement` of `@markuplint/ml-core` satisfies.
 */
type TreeElement = {
	readonly parentElement: unknown;
	getRootNode(): unknown;
};

/**
 * What {@link getComposedParentElement} reads besides {@link TreeElement}: the slot that places the
 * element in the flat tree. `null` is an element of a shadow host that no slot takes (not rendered),
 * `undefined` an element that is not one or whose assignment is not known.
 *
 * @template P - The type of the parent element the element reads
 */
type FlatTreeElement<P extends TreeElement> = {
	readonly parentElement: P | null;
	getRootNode(): unknown;
	getFlatTreeSlot(): P | null | undefined;
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
	getRootNode(): unknown;
}): P | null {
	const parent = el.parentElement;
	if (!parent) {
		return null;
	}
	return parent.getRootNode() === el.getRootNode() ? parent : null;
}

/**
 * The parent element of an element as the accessibility tree is built: the parent element in its own
 * tree, or, at the top of a shadow root, the host of the shadow root. `null` at the top of the content
 * of an ordinary `template` element, and at the top of a document or of any other root that is not a
 * shadow root. For a light child of a shadow host, the slot that takes it, or `null` when none does.
 *
 * @template P - The type of the parent element the element reads
 * @param el - The element to start from
 * @returns The parent element or the shadow host, or `null` when the walk ends
 */
export function getComposedParentElement<P extends TreeElement>(el: FlatTreeElement<P>): P | null {
	const slot = el.getFlatTreeSlot();
	if (slot !== undefined) {
		return slot;
	}
	const parent = getTreeParentElement(el);
	if (parent) {
		return parent;
	}
	const root = el.getRootNode();
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

/**
 * Whether an element is a `slot` element of the HTML namespace, which the accessibility tree does not
 * map: it has no role of its own, and what it renders (the nodes assigned to it, or its children)
 * belongs to the parent of the `slot`. A walk up the ancestors of the accessibility tree that reads
 * roles passes through it. The walks that read an attribute of the ancestors (`hidden`, `aria-hidden`)
 * do not skip it: what a `slot` that has them renders is hidden as well.
 *
 * It does not look at `MLParser#slotElement` on purpose: the `slot` of a framework (Vue, Svelte, Astro)
 * is replaced with what it is given, so it is no element of the accessibility tree either, and the
 * pass-through is right for it too. Which `slot` has an assignment is `MLElement#getAssignedNodes` of
 * `@markuplint/ml-core`, which does look at it.
 *
 * > No corresponding role
 *
 * @param el - An element
 * @returns `true` for the `slot` element of the HTML namespace
 * @see https://w3c.github.io/html-aam/#el-slot
 * @see https://dom.spec.whatwg.org/#find-flattened-slotables
 */
export function isSlotElement(el: { readonly localName: string; readonly namespaceURI?: string | null }): boolean {
	return el.localName === 'slot' && el.namespaceURI === XHTML_NAMESPACE;
}

/**
 * Whether an element is not rendered: it is a light child of a shadow host, and no slot of the shadow
 * root takes it (`getFlatTreeSlot()` is `null`). The flat tree has no place for it, so it is not in the
 * accessibility tree either, whatever its host is.
 *
 * @param el - An element
 * @returns `true` for an element that is known not to be rendered
 * @see https://dom.spec.whatwg.org/#find-flattened-slotables
 */
export function isNotRendered(el: { getFlatTreeSlot(): unknown }): boolean {
	return el.getFlatTreeSlot() === null;
}

/**
 * The parent element of an element in the accessibility tree: the composed parent element
 * ({@link getComposedParentElement}) with the `slot` elements passed through ({@link isSlotElement}). The walks
 * that read the roles of the ancestors take it; the walks that read an attribute of the ancestors take
 * {@link getComposedParentElement}, as what a `slot` that has `hidden` renders is hidden.
 *
 * @template E - The type of the element
 * @param el - The element to start from
 * @returns The parent element, or `null` when the walk ends
 */
export function getAccessibilityParentElement<
	E extends {
		readonly parentElement: E | null;
		readonly localName: string;
		readonly namespaceURI?: string | null;
		getRootNode(): unknown;
		getFlatTreeSlot(): E | null | undefined;
	},
>(el: E): E | null {
	let parent = getComposedParentElement(el);
	while (parent && isSlotElement(parent)) {
		parent = getComposedParentElement(parent);
	}
	return parent;
}
