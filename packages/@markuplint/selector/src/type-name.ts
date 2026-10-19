import type { SelectorElement } from './types.js';

import { vueTagNameMatches } from '@markuplint/shared';

import { isPureHTMLElement } from './is.js';

/**
 * Whether the type name of a selector (`FooBar` of a selector `FooBar`, `foo-bar` of `foo-bar`) stands for an element.
 *
 * Without `SelectorElement#tagNameKind` it is the comparison of HTML, and of the parsers
 * that tell the case of a tag name apart: `localName` as it is, folded to lower case only for an
 * element that `isPureHTMLElement` takes for an HTML element of a document that does not tell the case apart
 * (`SelectorElement#tagNameCaseSensitive`).
 *
 * With it, the document resolves a component by any spelling of its name, and the kind of the
 * element decides:
 *
 * - `component`: the rule of `vueTagNameMatches`. `localName` of a component is the name as written.
 * - `native`: an HTML element that has a specification. A tag with a capital letter is a component
 *   in such a document, and a native element is not registered under a name, so only the name in
 *   lower case stands for it: `button` stands for `<button>`, and neither `Button` nor `BUTTON` does
 *   (a selector of an HTML element is compared case-insensitively elsewhere, which this narrows in such a document).
 * - `unknown-html`: an HTML element that has no specification, `<foobar>`. A name of more than one
 *   word is not it (`FooBar` is not `<foobar>`), and the case of any other name is not told apart:
 *   `Foobar` is the name `<foobar>` resolves to. The case an element was written in is lost to `localName`
 *   (it is lower case), so this is told by the selector alone: a camelCase selector (`clipPath`) is
 *   no HTML element's, whereas `clippath` is, though `<clipPath>` in an SVG namespace is compared as it is.
 *
 * @param selectorName - The type name of the selector
 * @param el - The element
 * @returns Whether the name stands for the element
 */
export function typeNameMatches(
	selectorName: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
): boolean {
	switch (el.tagNameKind) {
		case 'component': {
			return vueTagNameMatches(selectorName, el.localName);
		}
		case 'native': {
			return selectorName === el.localName;
		}
		case 'unknown-html': {
			return !/[a-z\d][A-Z]/.test(selectorName) && selectorName.toLowerCase() === el.localName.toLowerCase();
		}
		default: {
			// HTML names its elements case-insensitively, but a parser that tells the case of a
			// tag name apart (`tagNameCaseSensitive`) has `<foobar>` and `<FooBar>` as two names.
			if (isPureHTMLElement(el) && !el.tagNameCaseSensitive) {
				return selectorName.toLowerCase() === el.localName.toLowerCase();
			}
			return selectorName === el.localName;
		}
	}
}
