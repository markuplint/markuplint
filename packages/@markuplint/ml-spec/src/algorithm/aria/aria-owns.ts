import type { QueryableRoot } from './id-reference.js';
import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { hasDisplayNoneOrVisibilityHiddenStyle } from '../dom/inline-style.js';
import { getAccessibilityParentElement, getComposedParentElement, isNotRendered } from '../dom/tree-boundary.js';
import { getExplicitRole } from './get-explicit-role.js';
import { getImplicitRole } from './get-implicit-role.js';
import { getQueryableRoot, splitIdReferences } from './id-reference.js';
import { isPresentational } from './is-presentational.js';

/**
 * @module
 *
 * The ownership that `aria-owns` adds to the accessibility tree: an element that an `aria-owns`
 * refers to is an accessibility child of the element that refers to it, not of its DOM parent.
 *
 * > If an element has both aria-owns and DOM children then the order of the accessibility children
 * > with respect to the parent/child relationship is the DOM children first, then the elements
 * > referenced in aria-owns.
 *
 * > Authors MUST ensure that an element's ID is not specified in more than one other element's
 * > aria-owns attribute at any time. In other words, an element can have only one explicit owner.
 * > Authors MUST NOT create circular references with aria-owns. In the case of authoring error with
 * > aria-owns, the user agent MAY ignore some aria-owns element references in order to build a
 * > consistent model of the content.
 *
 * > aria-owns is resolved in the order it is encountered in the DOM.
 *
 * > User agents MUST NOT resolve aria-owns when it is set on an element that has been excluded from
 * > the accessibility tree.
 *
 * > User agents MUST NOT resolve aria-owns when it references an element that is, or has a DOM
 * > ancestor that is, hidden from all users.
 *
 * So the owner of an element is the first element in tree order whose `aria-owns` lists the ID of the
 * element and is resolved; a later element that lists it is ignored. A reference that is part of a
 * cycle of the tree (a parent is an owner when it has one, and the DOM parent otherwise) is ignored,
 * every reference of the cycle alike, so the tree does not depend on which element is asked about
 * first. Ignoring them gives the elements of the cycle their DOM parents, which can close another
 * cycle through the references left, so the references are removed until no cycle is left.
 *
 * An ID is looked up as `id-reference.ts` describes. Being hidden from all users is read from the
 * markup of the element and its ancestors of the flat tree, as `isExposed` reads it: the `hidden`
 * attribute, an inline style of `display: none` or `visibility: hidden`, or a light child that no slot
 * takes. Those, `aria-hidden="true"`, and an ancestor whose role has presentational children exclude an
 * owner; `aria-hidden` does not hide the element an `aria-owns` refers to, as it does not hide an
 * element from all users. A style sheet is not read. The role of an ancestor is its explicit role, or
 * its implicit role when it has none or has `none` / `presentation`: the presentational children of a
 * role come from the role alone, and reading the computed role would ask for this ownership again.
 *
 * The ownership of a tree is computed once and kept for its root: the tree that `@markuplint/ml-core`
 * builds does not change while it is linted (a fix edits the source, which is parsed again into a new
 * tree), and every walk of the accessibility tree asks for it. The references as they are written,
 * which do not depend on the specification, are kept apart from the ownership a user agent resolves,
 * which does.
 *
 * @see https://w3c.github.io/aria/#aria-owns
 */

/**
 * The references of one tree as the markup writes them.
 */
type WrittenReferences = {
	/** The first element in tree order with each ID */
	readonly elementById: ReadonlyMap<string, Element>;
	/** The elements with `aria-owns`, in tree order */
	readonly referrers: readonly Element[];
	/** The first element in tree order whose `aria-owns` lists each element, hidden or not */
	readonly writtenOwnerOf: ReadonlyMap<Element, Element>;
	/** {@link WrittenReferences.writtenOwnerOf} without the references that are part of a cycle */
	readonly acyclicWrittenOwnerOf: ReadonlyMap<Element, Element>;
	/** The elements whose reference in {@link WrittenReferences.writtenOwnerOf} is part of a cycle */
	readonly circularTargets: ReadonlySet<Element>;
};

/**
 * The ownership a user agent resolves in one tree.
 */
type Ownership = {
	/** The owner of each owned element */
	readonly ownerOf: ReadonlyMap<Element, Element>;
	/** The elements each owner owns, in the order its `aria-owns` lists them */
	readonly ownedBy: ReadonlyMap<Element, readonly Element[]>;
};

const writtenOfRoot = new WeakMap<QueryableRoot, WrittenReferences>();
const ownershipOfRoot = new WeakMap<QueryableRoot, WeakMap<MLMLSpec, Map<ARIAVersion, Ownership>>>();

/**
 * The element whose `aria-owns` makes `el` its accessibility child, or `null` when no `aria-owns`
 * resolves to `el` (see the module comment for the order, the cycles and the excluded elements).
 *
 * @param el - The element that may be owned
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns The owner, or `null`
 */
export function getAriaOwner(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): Element | null {
	return getOwnership(el, specs, version)?.ownerOf.get(el) ?? null;
}

/**
 * The elements that the `aria-owns` of `el` makes its accessibility children, in the order the
 * attribute lists them: the ones whose owner ({@link getAriaOwner}) is `el`.
 *
 * @param el - The element that may own elements
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns The owned elements, or an empty array
 */
export function getAriaOwnedElements(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): Element[] {
	return [...(getOwnership(el, specs, version)?.ownedBy.get(el) ?? [])];
}

/**
 * The child nodes of `el` in the accessibility tree with `aria-owns` resolved: its child nodes
 * without the elements that another element owns through `aria-owns`, then the elements that its own
 * `aria-owns` makes its children ({@link getAriaOwnedElements}). A node that is not an element is kept
 * as it is.
 *
 * @template N - The type of the child nodes
 * @param el - The element whose children to list
 * @param childNodes - Its child nodes before `aria-owns` moves any
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns The child nodes
 */
export function resolveAriaOwnsChildren<N extends object>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	childNodes: readonly N[],
	specs: MLMLSpec,
	version: ARIAVersion,
): (N | Element)[] {
	// A child is looked up in its own tree: the children of a shadow host are those of its shadow root
	const kept = childNodes.filter(child => {
		if (!isElement(child)) {
			return true;
		}
		const owner = getAriaOwner(child, specs, version);
		return owner === null || owner === el;
	});
	const owned = getAriaOwnedElements(el, specs, version).filter(owned => !kept.includes(owned as unknown as N));
	return [...kept, ...owned];
}

/**
 * The child elements of `el` in the accessibility tree with `aria-owns` resolved
 * ({@link resolveAriaOwnsChildren}).
 *
 * @param el - The element whose children to list
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns The child elements
 */
export function getOwnedChildElements(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): Element[] {
	return resolveAriaOwnsChildren(el, [...el.children], specs, version) as Element[];
}

/**
 * The parent of an element in the accessibility tree with `aria-owns` resolved: the owner when an
 * `aria-owns` resolves to the element ({@link getAriaOwner}), otherwise the parent the DOM gives
 * ({@link getAccessibilityParentElement}).
 *
 * @param el - The element to start from
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns The parent element, or `null` when the walk ends
 */
export function getOwningParentElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): Element | null {
	return getAriaOwner(el, specs, version) ?? getAccessibilityParentElement(el);
}

/**
 * The element that an ID in the `aria-owns` of `referrer` refers to: the first element in tree order
 * with the ID in the tree of `referrer`.
 *
 * @param referrer - The element that has the `aria-owns`
 * @param id - An ID that its `aria-owns` lists
 * @returns The element, or `null` when no element in the tree has the ID
 */
export function getAriaOwnsTarget(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	referrer: Element,
	id: string,
): Element | null {
	return getWrittenReferences(referrer)?.elementById.get(id) ?? null;
}

/**
 * Whether the reference from the `aria-owns` of `referrer` to `target` is circular: `target` is
 * `referrer` itself, or an ancestor of `referrer` in the accessibility tree, so owning it would make
 * `referrer` its own ancestor.
 *
 * > Authors MUST NOT create circular references with aria-owns.
 *
 * It reads the markup as the author wrote it: every `aria-owns` counts (the first element in tree order
 * that lists an ID), including the ones on an excluded element, which {@link getAriaOwner} does not
 * resolve. The references that are part of a cycle are removed until none is, as {@link getAriaOwner}
 * does, and every reference removed on the way is circular: one that closes a cycle only once another
 * cycle is broken is reported as well. A later element that lists an ID that an earlier one lists is
 * circular when `target` is its ancestor in the tree that is left.
 *
 * @param referrer - The element that has the `aria-owns`
 * @param target - The element that its `aria-owns` refers to
 * @returns `true` for a circular reference
 * @see https://w3c.github.io/aria/#aria-owns
 */
export function isCircularAriaOwnsReference(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	referrer: Element,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	target: Element,
): boolean {
	if (referrer === target) {
		return true;
	}
	const written = getWrittenReferences(referrer);
	if (written?.writtenOwnerOf.get(target) === referrer) {
		return written.circularTargets.has(target);
	}
	const visited = new Set<Element>();
	let ancestor: Element | null = referrer;
	while (ancestor && !visited.has(ancestor)) {
		if (ancestor === target) {
			return true;
		}
		visited.add(ancestor);
		ancestor = written?.acyclicWrittenOwnerOf.get(ancestor) ?? getAccessibilityParentElement(ancestor);
	}
	return false;
}

/**
 * The first element in tree order whose `aria-owns` lists the ID of `target`, as the markup writes it:
 * an element that is excluded from the accessibility tree counts. The ones after it specify the ID in
 * more than one element's `aria-owns`.
 *
 * @param target - The element that may be referred to
 * @returns The element, or `null` when no `aria-owns` lists it (an element that lists its own ID does
 * not count)
 * @see https://w3c.github.io/aria/#aria-owns
 */
export function getFirstAriaOwnsReferrer(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	target: Element,
): Element | null {
	return getWrittenReferences(target)?.writtenOwnerOf.get(target) ?? null;
}

function isElement(node: object): node is Element {
	return (node as { nodeType?: number }).nodeType === 1;
}

function getWrittenReferences(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): WrittenReferences | null {
	const root = getQueryableRoot(el);
	if (!root) {
		return null;
	}
	let written = writtenOfRoot.get(root);
	if (!written) {
		written = computeWrittenReferences(root);
		writtenOfRoot.set(root, written);
	}
	return written;
}

function getOwnership(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): Ownership | null {
	const root = getQueryableRoot(el);
	const written = getWrittenReferences(el);
	if (!root || !written) {
		return null;
	}
	let ofSpecs = ownershipOfRoot.get(root);
	if (!ofSpecs) {
		ofSpecs = new WeakMap();
		ownershipOfRoot.set(root, ofSpecs);
	}
	let ofVersion = ofSpecs.get(specs);
	if (!ofVersion) {
		ofVersion = new Map();
		ofSpecs.set(specs, ofVersion);
	}
	let ownership = ofVersion.get(version);
	if (!ownership) {
		ownership = computeOwnership(written, specs, version);
		ofVersion.set(version, ownership);
	}
	return ownership;
}

function computeWrittenReferences(root: QueryableRoot): WrittenReferences {
	const elementById = new Map<string, Element>();
	for (const el of root.querySelectorAll('[id]')) {
		const id = el.getAttribute('id');
		if (id && el.getRootNode() === root && !elementById.has(id)) {
			elementById.set(id, el);
		}
	}

	const referrers = [...root.querySelectorAll('[aria-owns]')].filter(el => el.getRootNode() === root);

	const writtenOwnerOf = new Map<Element, Element>();
	for (const referrer of referrers) {
		for (const id of splitIdReferences(referrer.getAttribute('aria-owns'))) {
			const target = elementById.get(id);
			if (target && target !== referrer && !writtenOwnerOf.has(target)) {
				writtenOwnerOf.set(target, referrer);
			}
		}
	}

	const acyclicWrittenOwnerOf = new Map(writtenOwnerOf);
	const circularTargets = removeCycles(acyclicWrittenOwnerOf);

	return { elementById, referrers, writtenOwnerOf, acyclicWrittenOwnerOf, circularTargets };
}

function computeOwnership(written: WrittenReferences, specs: MLMLSpec, version: ARIAVersion): Ownership {
	const ownerOf = new Map<Element, Element>();
	for (const referrer of written.referrers) {
		// The `aria-owns` of an excluded element is not resolved, so it takes no part in the order
		if (isExcludedOwner(referrer, specs, version)) {
			continue;
		}
		for (const id of splitIdReferences(referrer.getAttribute('aria-owns'))) {
			const target = written.elementById.get(id);
			if (!target || target === referrer || ownerOf.has(target) || isHiddenFromAllUsers(target)) {
				continue;
			}
			ownerOf.set(target, referrer);
		}
	}

	removeCycles(ownerOf);

	const ownedBy = new Map<Element, Element[]>();
	for (const referrer of written.referrers) {
		for (const id of splitIdReferences(referrer.getAttribute('aria-owns'))) {
			const target = written.elementById.get(id);
			if (!target || ownerOf.get(target) !== referrer) {
				continue;
			}
			const owned = ownedBy.get(referrer) ?? [];
			if (!owned.includes(target)) {
				owned.push(target);
			}
			ownedBy.set(referrer, owned);
		}
	}

	return { ownerOf, ownedBy };
}

/**
 * Removes the references that are part of a cycle, until none is.
 *
 * @returns The owned elements whose references were removed
 */
function removeCycles(ownerOf: Map<Element, Element>): Set<Element> {
	const removed = new Set<Element>();
	for (;;) {
		const inCycle: Element[] = [];
		for (const [target, owner] of ownerOf) {
			const visited = new Set<Element>();
			let ancestor: Element | null = owner;
			while (ancestor && !visited.has(ancestor)) {
				if (ancestor === target) {
					inCycle.push(target);
					break;
				}
				visited.add(ancestor);
				ancestor = ownerOf.get(ancestor) ?? getAccessibilityParentElement(ancestor);
			}
		}
		if (inCycle.length === 0) {
			return removed;
		}
		for (const target of inCycle) {
			ownerOf.delete(target);
			removed.add(target);
		}
	}
}

function isHiddenFromAllUsers(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	let current: Element | null = el;
	while (current) {
		if (
			isNotRendered(current) ||
			current.hasAttribute('hidden') ||
			hasDisplayNoneOrVisibilityHiddenStyle(current)
		) {
			return true;
		}
		current = getComposedParentElement(current);
	}
	return false;
}

function isExcludedOwner(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	let current: Element | null = el;
	while (current) {
		if (
			isNotRendered(current) ||
			current.hasAttribute('hidden') ||
			hasDisplayNoneOrVisibilityHiddenStyle(current) ||
			current.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true'
		) {
			return true;
		}
		const parent: Element | null = getComposedParentElement(current);
		if (parent && hasPresentationalChildren(parent, specs, version)) {
			return true;
		}
		current = parent;
	}
	return false;
}

/**
 * Whether the role of an element has presentational children, read from its explicit role, or its
 * implicit role when it has none or has `none` / `presentation` (see the module comment).
 */
function hasPresentationalChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	const explicit = getExplicitRole(specs, el, version).role;
	const role = explicit && !isPresentational(explicit.name) ? explicit : getImplicitRole(specs, el, version).role;
	return role?.childrenPresentational ?? false;
}
