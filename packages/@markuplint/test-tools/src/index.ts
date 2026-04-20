/**
 * @module @markuplint/test-tools
 *
 * A private utility package that provides shared testing helpers for the markuplint repository.
 * Includes re-exports of common test dependencies (glob, execa) and DOM creation utilities
 * for constructing JSDOM-based elements used in unit and integration tests.
 */

export * from './exports.js';

import { JSDOM } from 'jsdom';

/**
 * Creates a DOM element from an HTML string using JSDOM.
 *
 * Sets up the global `window`, `Element`, and `getComputedStyle` bindings required
 * by markuplint's spec utilities. When the HTML string starts with `<html>`, the
 * entire document is parsed and the root `<html>` element is returned. Otherwise,
 * a document fragment is created: if the HTML begins with `<td`, a `<tr>` container
 * is used to ensure valid table-cell parsing; a `<div>` container is used in all
 * other cases.
 *
 * @param html - The HTML markup string to parse into a DOM element.
 * @param selector - An optional CSS selector used to pick a specific element from the
 *   parsed fragment. When omitted, the first child node of the fragment is returned.
 * @param matches - An optional custom implementation of `Element.prototype.matches`
 *   that will override the default JSDOM behavior, useful for testing selector-matching logic.
 * @returns The resulting DOM `Element` matching the given selector or the first child node.
 * @throws {Error} If no element could be created from the provided HTML, or if the given
 *   selector does not match any element in the fragment.
 */
export function createJSDOMElement(
	html: string,
	selector?: string,
	matches?: (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		this: Element,
		selector: string,
	) => boolean,
) {
	if (/^<html>/i.test(html)) {
		const dom = new JSDOM(html);
		// @ts-ignore
		globalThis.window = dom.window;
		globalThis.Element = dom.window.Element;
		globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
		if (matches) {
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			dom.window.Element.prototype.matches = function (this: Element, selector: string) {
				return matches.call(this, selector);
			} as any;
		}
		return dom.window.document.querySelector('html') as Element;
	}
	const dom = new JSDOM();
	// @ts-ignore
	globalThis.window = dom.window;
	globalThis.Element = dom.window.Element;
	globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
	if (matches) {
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		dom.window.Element.prototype.matches = function (this: Element, selector: string) {
			return matches.call(this, selector);
		} as any;
	}

	const containerTag = html.indexOf('<td') === 0 ? 'tr' : 'div';

	const fragment = dom.window.document.createDocumentFragment();
	const container = dom.window.document.createElement(containerTag);
	container.innerHTML = html;
	fragment.append(...container.childNodes);
	if (selector) {
		const el = fragment.querySelector(selector);
		if (!el) {
			throw new Error('An element is not created');
		}
		return el;
	}
	if (!fragment.firstChild) {
		throw new Error('An element is not created');
	}
	return fragment.firstChild as Element;
}
