import type { FormattedPrimitiveTypeCreator } from '../types';

/**
 * PotentialCustomElementName
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');
const rePCEN = new RegExp(`^[a-z](?:${rePCENChar})*\\-(?:${rePCENChar})*$`, 'i');

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
 */
export const isCustomElementName: FormattedPrimitiveTypeCreator = () => {
	return tagName => {
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
	};
};
