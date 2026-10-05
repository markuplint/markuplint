import type { Mode } from './types.js';
import type { PlainData } from '@markuplint/ml-config';
import type { ChildNode, Element, PretenderSlotContent, RuleConfigValue } from '@markuplint/ml-core';

/**
 * Returns the slot-content description of a pretended component, which exists
 * only in `'pretended'` mode: the `'origin'` mode evaluates user tag rules keyed
 * on the component name against the children as written at the usage site.
 *
 * The helpers in this file are generic over the rule's value and options types
 * because `require-owned-elements` shares them, so that both rules read a
 * pretended component the same way.
 *
 * @see PretenderSlotContent in `@markuplint/ml-core`
 */
export function getSlotContent<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	mode: Mode,
): PretenderSlotContent<Element<T, O>, T, O> | null {
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
export function getContentOwner<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	mode: Mode,
): Element<T, O> {
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
export function expandChildren<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	given: readonly ChildNode<T, O>[],
	mode: Mode,
): readonly ChildNode<T, O>[] {
	const slotContent = getSlotContent(el, mode);
	const children = slotContent ? slotContent.fill(given) : given;
	return children.flatMap(child => expandFragment(child, mode));
}

/**
 * Whether a required child of `el` may be rendered by something the pretender
 * does not know: an unknown entry in its own `contents`, or in the `contents` of
 * a fragment pretender among its children (which stands in the parent).
 */
export function isContentMutable<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<T, O>,
	mode: Mode,
): boolean {
	if (getSlotContent(el, mode)?.mutable) {
		return true;
	}
	return [...el.childNodes].some(child => isFragmentPretender(child, mode) && isContentMutable(child, mode));
}

function isFragmentPretender<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode<T, O>,
	mode: Mode,
): node is Element<T, O> {
	return (
		mode === 'pretended' &&
		node.is(node.ELEMENT_NODE) &&
		node.pretenderContext?.type === 'pretender' &&
		node.localName === '#fragment'
	);
}

function expandFragment<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode<T, O>,
	mode: Mode,
): readonly ChildNode<T, O>[] {
	return isFragmentPretender(node, mode) ? expandChildren(node, [...node.childNodes], mode) : [node];
}

/**
 * A violation on an element that only the pretender renders (`contents`) is reported
 * on the component that renders it: the element does not exist in the source.
 */
export function getReportScope<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode<T, O>,
): ChildNode<T, O> {
	if (node.is(node.ELEMENT_NODE) && node.pretenderContext?.type === 'origin') {
		return node.pretenderContext.origin;
	}
	return node;
}
