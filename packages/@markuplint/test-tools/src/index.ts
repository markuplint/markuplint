export * from './exports.js';

import { JSDOM } from 'jsdom';

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
			dom.window.Element.prototype.matches = function (selector: string) {
				return matches.call(this, selector);
			};
		}
		return dom.window.document.querySelector('html') as Element;
	}
	const dom = new JSDOM();
	// @ts-ignore
	globalThis.window = dom.window;
	globalThis.Element = dom.window.Element;
	globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
	if (matches) {
		dom.window.Element.prototype.matches = function (selector: string) {
			return matches.call(this, selector);
		};
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
