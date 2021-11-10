import { rePCEN, svgElementList } from './const';

/**
 *
 *
 * @param nodeName
 * @returns
 */
export function isSVGElement(nodeName: string) {
	return svgElementList.includes(nodeName);
}

/**
 * valid name of custom element
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 *
 * > - name must match the [PotentialCustomElementName](https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname) production
 * > - name must not be any of the following:
 * >   - `<annotation-xml>`
 * >   - `<color-profile>`
 * >   - `<font-face>`
 * >   - `<font-face-src>`
 * >   - `<font-face-uri>`
 * >   - `<font-face-format>`
 * >   - `<font-face-name>`
 * >   - `<missing-glyph>`
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 *
 * @param tagName
 */
export function isPotentialCustomElementName(tagName: string) {
	switch (tagName) {
		case 'annotation-xml':
		case 'color-profile':
		case 'font-face':
		case 'font-face-src':
		case 'font-face-uri':
		case 'font-face-format':
		case 'font-face-name':
		case 'missing-glyph': {
			return false;
		}
	}
	return rePCEN.test(tagName);
}
