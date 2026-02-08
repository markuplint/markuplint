/**
 * Checks whether the given node is an Element node.
 *
 * @param node - The DOM node to check
 * @returns `true` if the node is an Element
 */
export function isElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): node is Element {
	return node.nodeType === node.ELEMENT_NODE;
}

/**
 * Checks whether the given node is a non-DocumentType child node
 * (i.e., has `previousElementSibling` and `nextElementSibling` properties).
 *
 * @param node - The DOM node to check
 * @returns `true` if the node is an Element or CharacterData
 */
export function isNonDocumentTypeChildNode(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): node is Element | CharacterData {
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
	el: Element,
) {
	return el.localName !== el.nodeName;
}
