export function isElement(node: Node): node is Element {
	return node.nodeType === node.ELEMENT_NODE;
}

export function isNonDocumentTypeChildNode(node: Node): node is Element | CharacterData {
	return 'previousElementSibling' in node && 'nextElementSibling' in node;
}

export function isPureHTMLElement(el: Element) {
	return el.localName !== el.nodeName;
}
