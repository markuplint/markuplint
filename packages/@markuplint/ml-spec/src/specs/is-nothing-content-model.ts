import { isVoidElement } from './is-void-element.js';

/**
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model
 * @see https://html.spec.whatwg.org/multipage/indices.html#elements-3
 */
export function isNothingContentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return isVoidElement(el) || ['iframe', 'template'].includes(el.localName);
}
