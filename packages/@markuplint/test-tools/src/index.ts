import { JSDOM } from 'jsdom';

export function createJSDOMElement(
	html: string,
	selector?: string,
	matches?: (this: Element, selector: string) => boolean,
) {
	if (/^<html>/i.test(html)) {
		const dom = new JSDOM(html);
		// @ts-ignore
		global.window = dom.window;
		global.Element = dom.window.Element;
		global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
		if (matches) {
			dom.window.Element.prototype.matches = function (selector: string) {
				return matches.call(this, selector);
			};
		}
		return dom.window.document.querySelector('html') as Element;
	}
	const dom = new JSDOM();
	// @ts-ignore
	global.window = dom.window;
	global.Element = dom.window.Element;
	global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
	if (matches) {
		dom.window.Element.prototype.matches = function (selector: string) {
			return matches.call(this, selector);
		};
	}
	const fragment = dom.window.document.createElement('div');
	fragment.innerHTML = html;
	dom.window.document.body.appendChild(fragment);
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
