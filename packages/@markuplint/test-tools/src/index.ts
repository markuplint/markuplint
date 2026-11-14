/**
 * @module @markuplint/test-tools
 *
 * A private utility package that provides shared testing helpers for the markuplint repository.
 * Includes re-exports of common test dependencies (glob, execa) and DOM creation utilities
 * for constructing JSDOM-based elements used in unit and integration tests.
 *
 * The reader of the messages that a source file passes to the translator (the locale guards of
 * `@markuplint/rules` and `@markuplint/language-server`) is the subpath export `./translator-templates`,
 * kept out of this entry point because it loads the TypeScript compiler.
 */

export * from './exports.js';

import { JSDOM } from 'jsdom';

/**
 * jsdom follows CSSOM and returns an empty declaration block from `getComputedStyle` for a node
 * that is not connected to a document, which hides CSS-based states (`display: none`) from the
 * code under test. `createJSDOMElement` builds its nodes in a document fragment, and connecting
 * them would change their `parentElement`, so the style is read from a connected copy of the tree.
 *
 * The copy is rebuilt only when a `MutationObserver` on the tree reports a change since it was
 * made (`takeRecords()` answers at once, unlike the observer callback): a copy per call is
 * quadratic in the number of nodes, and a copy that outlives a change would answer for a tree
 * that no longer exists. The window is the one that owns the node.
 *
 * Known limitations: the declaration is a snapshot of the tree at the call, and the copy it was
 * read from is removed when the tree changes, so read it before changing the tree; a node in a
 * shadow tree cannot be copied and falls back to the plain behavior; a change that no mutation
 * shows (`sheet.insertRule`) is not noticed; the top-level nodes of a fragment sit in a `<div>`
 * of the copy, so a selector that depends on having no parent element (`div > .x`,
 * `:first-child`, `body > .x`) can answer differently from the original.
 *
 * @see https://drafts.csswg.org/cssom/#dom-window-getcomputedstyle
 */
function detachedAwareGetComputedStyle() {
	const copies = new WeakMap<Node, { readonly observer: MutationObserver; holder: Element }>();
	return (el: Element, pseudoElt?: string | null) => {
		const window = el.ownerDocument.defaultView!;
		if (el.isConnected) {
			return window.getComputedStyle(el, pseudoElt);
		}
		const root = el.getRootNode();
		if ('host' in root) {
			return window.getComputedStyle(el, pseudoElt);
		}
		let copy = copies.get(root);
		if (copy && copy.observer.takeRecords().length > 0) {
			copy.observer.disconnect();
			copy.holder.remove();
			copy = undefined;
		}
		if (!copy) {
			const observer = new window.MutationObserver(() => {});
			observer.observe(root, { attributes: true, characterData: true, childList: true, subtree: true });
			const holder = window.document.createElement('div');
			window.document.body.append(holder);
			const clone = root.cloneNode(true);
			// A fragment cannot be a child of the holder: its children move into the holder, which then
			// stands for the root. Any other root is appended as it is.
			holder.append(...(clone.nodeType === clone.DOCUMENT_FRAGMENT_NODE ? [...clone.childNodes] : [clone]));
			copy = { observer, holder };
			copies.set(root, copy);
		}
		// The index path re-locates `el` in the copy, which has the same shape as the original.
		const path: number[] = [];
		let node: Node = el;
		while (node !== root && node.parentNode) {
			path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
			node = node.parentNode;
		}
		let target: Node | undefined =
			root.nodeType === root.DOCUMENT_FRAGMENT_NODE ? copy.holder : copy.holder.firstChild!;
		for (const index of path) {
			target = target?.childNodes[index];
		}
		// A copy that differs in shape from the original (a `<template>` content) has no such node.
		return window.getComputedStyle((target ?? el) as Element, pseudoElt);
	};
}

/**
 * Creates a DOM element from an HTML string using JSDOM.
 *
 * Sets up the global `window`, `Element`, and `getComputedStyle` bindings required
 * by markuplint's spec utilities. The fragment path installs a `getComputedStyle` that
 * also resolves the nodes of the detached tree; the `<html>` path keeps the plain one
 * because its tree is connected. When the HTML string starts with `<html>`, the
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
		// The tree of this path is connected, so the plain `getComputedStyle` resolves it.
		globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
		if (matches) {
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
	globalThis.getComputedStyle = detachedAwareGetComputedStyle();
	if (matches) {
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
