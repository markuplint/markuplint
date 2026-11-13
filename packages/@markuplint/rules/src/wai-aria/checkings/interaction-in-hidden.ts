import type { Options } from '../types.js';
import type { Attr, Element, ElementChecker } from '@markuplint/ml-core';

import { getComposedParentElement, mayBeFocusable } from '@markuplint/ml-spec';

/**
 * Checks whether a focusable interactive element is inside an `aria-hidden=true` subtree.
 *
 * Including Elements in the Accessibility Tree
 *
 * @see https://w3c.github.io/aria/#tree_inclusion
 * > Elements that are not hidden and can fire an accessibility API event, including:
 * > - Elements that are currently focused, even if the element or one of its ancestor elements has its aria-hidden attribute set to true.
 * > - Elements that are a valid target of an aria-activedescendant attribute.
 *
 * When a focused element exists within an `aria-hidden=true` ancestor, it is still
 * exposed to the accessibility tree. This situation is almost always unintentional --
 * while not strictly invalid per spec, it requires careful attention from the developer.
 *
 * @param el - The element node to inspect for focusability within a hidden context.
 * @returns A violation if the element is focusable and has `aria-hidden=true` on itself or an ancestor.
 */
export const checkingInteractionInHidden: ElementChecker<boolean, Options> =
	({ el }) =>
	t => {
		if (!mayBeFocusable(el, el.ownerMLDocument.specs)) {
			return;
		}
		const ariaHidden = getClosestAriaHidden(el);
		if (!ariaHidden) {
			return;
		}
		if (el === ariaHidden.ownerElement) {
			return {
				scope: el,
				message: t('It may be focusable in spite of it has aria-hidden=true'),
			};
		}
		return {
			scope: el,
			message: t('It may be focusable in spite of it has the ancestor that has aria-hidden=true'),
		};
	};

/**
 * Traverses the element's ancestor chain to find the closest element with `aria-hidden="true"`.
 *
 * The chain is the one the accessibility tree is built from ({@link getComposedParentElement}): it ends at the
 * top of the content of an ordinary `template` element, which is not rendered and whose placement is not known,
 * and it goes on from a declarative shadow root to its host.
 *
 * @param el - The element to start searching from (inclusive).
 * @returns The `aria-hidden` attribute node if found, or `null` if no ancestor is hidden.
 */
function getClosestAriaHidden(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
): Attr<boolean, Options> | null {
	let current: Element<boolean, Options> | null = el;
	while (current) {
		const ariaHidden = current.getAttrNode('aria-hidden');
		if (ariaHidden?.value === 'true') {
			return ariaHidden;
		}
		current = getComposedParentElement(current);
	}
	return null;
}
