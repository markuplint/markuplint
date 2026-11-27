import type { MLElement } from '../node/element.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { isAriaTrue } from '@markuplint/ml-spec';

import { getRenderedChildNodes } from './accname.js';
import { isPretenderDeclaredElement } from './declared-elements.js';

/**
 * Whether an element renders content that the markup does not tell: an unknown entry (`{ dynamic: true }`) in the
 * `contents` of a pretended component, a `template` whose shadow root is only maybe attached (its content is left
 * out of the computed name, as the shadow root may replace it), or such an element
 * among the children that it renders. The children are those {@link getRenderedChildNodes} returns, with the
 * branches of the conditional blocks read as one (`everyBranch`): which branch is rendered is not known, so an
 * element in any of them may be the one whose content is unknown. A hidden child is skipped because the name
 * computation never reads it.
 *
 * Unknown `contents` of a pretended component count only when no declarative shadow root is attached to it: the
 * shadow root is rendered in their place.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element
 * @returns `true` if some of its content is not known
 */
export function hasUnknownContent<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	const context = el.pretenderContext;
	if (context?.type === 'pretender' && context.slotContent?.mutable && !el.declarativeShadowRoot) {
		return true;
	}
	if (context?.type !== 'pretender' && el.isHTMLTemplateElement && el.declarativeShadowRootAttachment === 'unknown') {
		return true;
	}
	return [...getRenderedChildNodes(el, { everyBranch: true })].some(
		child =>
			child.is(child.ELEMENT_NODE) &&
			!isAriaTrue(child.getAttribute('aria-hidden')) &&
			!child.hasAttribute('hidden') &&
			hasUnknownContent(child),
	);
}

/**
 * Whether the text that an element gives as the target of a reference (`aria-labelledby`) is not known from the
 * markup: it is one that a pretender declares, which declares no content (a heading declared as `h2` renders its
 * text), or it has content that the markup does not tell ({@link hasUnknownContent}).
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - The element that a reference refers to
 * @returns `true` if the text it gives is not known
 * @see https://w3c.github.io/accname/#comp_labelledby
 */
export function referencedTextMayBeUnknown<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	return isPretenderDeclaredElement(el) || hasUnknownContent(el);
}
