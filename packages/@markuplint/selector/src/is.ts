export function isElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): node is Element {
	return node.nodeType === node.ELEMENT_NODE;
}

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
