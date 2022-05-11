export function isPureHTMLElement(el: Element) {
	return el.localName !== el.nodeName;
}
