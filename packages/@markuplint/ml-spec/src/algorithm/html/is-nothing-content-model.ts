import { isVoidElement } from './is-void-element.js';

/**
 * Determines whether an element uses the "nothing" content model, meaning it
 * must not contain any content. This includes void elements as well as
 * `<iframe>` and `<template>` elements.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model
 * @see https://html.spec.whatwg.org/multipage/indices.html#elements-3
 *
 * @param el - The DOM element to check
 * @returns `true` if the element has the "nothing" content model
 */
export function isNothingContentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return isVoidElement(el) || ['iframe', 'template'].includes(el.localName);
}
