import type { ChildNode, Element, Mode, Options, TagRule } from './types.js';
import type { PretenderSlotContent } from '@markuplint/ml-core';

/**
 * Returns the slot-content description of a pretended component, which exists
 * only in `'pretended'` mode: the `'origin'` mode evaluates user tag rules keyed
 * on the component name against the children as written at the usage site.
 *
 * @see PretenderSlotContent in `@markuplint/ml-core`
 */
export function getSlotContent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	mode: Mode,
): PretenderSlotContent<Element, TagRule[], Options> | null {
	if (mode !== 'pretended') {
		return null;
	}
	const context = el.pretenderContext;
	return context?.type === 'pretender' ? (context.slotContent ?? null) : null;
}

/**
 * The element whose content model governs the children of `el`.
 * It is the slot wrapper element when the pretender declares exactly one, and
 * `el` itself otherwise (including the outermost virtual element, which `el`
 * already delegates its name and attributes to).
 */
export function getContentOwner(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	mode: Mode,
): Element {
	const wrapper = getSlotContent(el, mode)?.wrapper;
	const context = el.pretenderContext;
	if (wrapper && context?.type === 'pretender' && wrapper !== context.as) {
		return wrapper;
	}
	return el;
}

/**
 * The children of `el` to validate: the nodes given at the usage site, passed
 * through the pretender's `contents` when it declares any, with the children of
 * fragment pretenders (`element: '#fragment'`) expanded in place because such a
 * component contributes its contents directly to its parent.
 */
export function expandChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	given: readonly ChildNode[],
	mode: Mode,
): readonly ChildNode[] {
	const slotContent = getSlotContent(el, mode);
	const children = slotContent ? slotContent.fill(given) : given;
	return children.flatMap(child => expandFragment(child, mode));
}

/**
 * Whether a required child of `el` may be rendered by something the pretender
 * does not know: an unknown entry in its own `contents`, or in the `contents` of
 * a fragment pretender among its children (which stands in the parent).
 */
export function isContentMutable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	mode: Mode,
): boolean {
	if (getSlotContent(el, mode)?.mutable) {
		return true;
	}
	return [...el.childNodes].some(child => isFragmentPretender(child, mode) && isContentMutable(child, mode));
}

function isFragmentPretender(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
	mode: Mode,
): node is Element {
	return (
		mode === 'pretended' &&
		node.is(node.ELEMENT_NODE) &&
		node.pretenderContext?.type === 'pretender' &&
		node.localName === '#fragment'
	);
}

function expandFragment(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
	mode: Mode,
): readonly ChildNode[] {
	return isFragmentPretender(node, mode) ? expandChildren(node, [...node.childNodes], mode) : [node];
}

/**
 * A violation on an element that only the pretender renders (`contents`) is reported
 * on the component that renders it: the element does not exist in the source.
 */
export function getReportScope(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
): ChildNode {
	if (node.is(node.ELEMENT_NODE) && node.pretenderContext?.type === 'origin') {
		return node.pretenderContext.origin;
	}
	return node;
}
