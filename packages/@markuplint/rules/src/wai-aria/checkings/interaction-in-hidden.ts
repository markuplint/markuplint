import type { Options } from '../types';
import type { Attr, Element, ElementChecker } from '@markuplint/ml-core';

import { mayBeFocusable } from '@markuplint/ml-spec';

/**
 * Including Elements in the Accessibility Tree
 *
 * @see https://w3c.github.io/aria/#tree_inclusion
 * > Elements that are not hidden and may fire an accessibility API event, including:
 * > - Elements that are currently focused, even if the element or one of its ancestor elements has its aria-hidden attribute set to true.
 * > - Elements that are a valid target of an aria-activedescendant attribute.
 */
// フォーカスがあたっている場合に限り、先祖がaria-hidden=trueでもアクセシビリティツリーに提示される
// なので、aria-hidden=trueの子孫要素で且つインタラクティブ要素である場合、
// それは開発者にとってはほとんどの場合、意図しないことが多いはずなので、
// 仕様上不正にはならないが、十分に注意しなければならない状態である。
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

function getClosestAriaHidden(el: Element<boolean, Options>): Attr<boolean, Options> | null {
	let current: Element<boolean, Options> | null = el;
	while (current) {
		const ariaHidden = current.getAttributeNode('aria-hidden');
		if (ariaHidden?.value === 'true') {
			return ariaHidden;
		}
		current = current.parentElement;
	}
	return null;
}
