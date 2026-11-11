import type { SelectorAttr, SelectorElement } from './types.js';

import { asciiLowerCase } from '@markuplint/shared';

import { isPureHTMLElement } from './is.js';

/**
 * Folds a name for comparing it with the name of an attribute.
 *
 * Attribute names are ASCII case-insensitive when the element is in the HTML namespace, and case-sensitive
 * for SVG, MathML and custom elements (SVG `viewBox`). A host that knows what the DOM does with the name
 * says so on the attribute (`SelectorAttr#nameCaseInsensitive`); otherwise `isPureHTMLElement` decides.
 * Every comparison of an attribute name with an element goes through here, so that they do not drift.
 *
 * @param attr - The attribute that the name is compared with
 * @param el - The element that has the attribute
 * @param name - The name to fold
 * @returns The name, lower-cased when the comparison is case-insensitive
 */
export function foldAttrName(
	attr: Pick<SelectorAttr, 'nameCaseInsensitive'>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
	name: string,
): string {
	return (attr.nameCaseInsensitive ?? isPureHTMLElement(el)) ? asciiLowerCase(name) : name;
}
