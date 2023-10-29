import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * PCENChar
 *
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 */
const onlyPCENChar =
	// eslint-disable-next-line no-misleading-character-class
	/^[-.\d_a-z\u00B7\u00C0-\u00D6[\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]*$/u;

/**
 * valid name of custom element
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * > They start with an ASCII lower alpha, ensuring that the HTML parser will treat them as tags instead of as text.
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
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
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

		// First char must be ASCII lowercase alpha.
		if (!/^[a-z]/.test(tagName)) {
			return false;
		}

		if (!tagName.includes('-')) {
			return false;
		}

		return onlyPCENChar.test(tagName);
	};
};
