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

export function isPureHTMLElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return el.localName !== el.nodeName;
}
