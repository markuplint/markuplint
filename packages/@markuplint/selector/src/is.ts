import type { SelectorElement, SelectorNode } from './types.js';

const ELEMENT_NODE = 1;

/**
 * Checks whether the given node is an Element node.
 *
 * @param node - The node to check
 * @returns `true` if the node is an Element
 */
export function isElement(node: SelectorNode): node is SelectorElement {
	return node.nodeType === ELEMENT_NODE;
}

/**
 * Checks whether the given node is a non-DocumentType child node
 * (i.e., has `previousElementSibling` and `nextElementSibling` properties).
 *
 * @param node - The node to check
 * @returns `true` if the node is an Element or CharacterData
 */
export function isNonDocumentTypeChildNode(node: SelectorNode): node is SelectorElement {
	return 'previousElementSibling' in node && 'nextElementSibling' in node;
}

/**
 * Checks if the given element is a pure HTML element.
 *
 * If a pure HTML element, `localName` returns lowercase,
 * `nodeName` returns uppercase.
 *
 * @param el The element to check.
 * @returns Returns true if the element is a pure HTML element, otherwise returns false.
 */
export function isPureHTMLElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
) {
	return el.localName !== el.nodeName;
}
