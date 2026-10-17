import type { SelectorElement, SelectorNode } from './types.js';

const ELEMENT_NODE = 1;

export function isElement(node: SelectorNode): node is SelectorElement {
	return node.nodeType === ELEMENT_NODE;
}

export function isNonDocumentTypeChildNode(node: SelectorNode): node is SelectorElement {
	return 'previousElementSibling' in node && 'nextElementSibling' in node;
}

/**
 * For a pure HTML element, `localName` returns lowercase while `nodeName`
 * returns uppercase. That asymmetry is the convention HTML parsers apply only
 * to elements in the HTML namespace (e.g. `localName === 'meta'` while
 * `nodeName === 'META'`); SVG, MathML, and custom elements keep
 * `localName === nodeName`, so the inequality check discriminates them without
 * inspecting `namespaceURI`.
 *
 * Per HTML LS / Selectors Level 4, tag and attribute name comparisons are
 * ASCII case-insensitive only for HTML elements. Any new logic that compares
 * attribute names against an element must route through this guard; otherwise SVG
 * content like `viewBox` and HTML content like `CHARSET` will start drifting
 * in opposite directions.
 *
 * A comparison of tag names needs the document too (`SelectorElement#tagNameCaseSensitive`):
 * a parser that tells the case of a tag name apart (JSX) gives `<foobar>` the same
 * `localName` / `nodeName` pair as any HTML element, though `<foobar>` is not `<FooBar>`
 * there. So it asks both, and the guard alone is enough only for attribute names:
 * Svelte and Astro tell the case of a tag name apart but not that of an attribute name.
 *
 * @see https://www.w3.org/TR/selectors-4/
 */
export function isPureHTMLElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
) {
	return el.localName !== el.nodeName;
}
