import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * Characters that make a name fail "valid element local name" when its first
 * code point is an ASCII alpha (the only case here: a custom element name
 * starts with an ASCII lower alpha, so the branch for `:`, `_` and U+0080 and
 * above is never reached).
 *
 * > If name's 0th code point is an ASCII alpha:
 * >
 * > If name contains ASCII whitespace, U+0000 NULL, U+002F (/), or U+003E (>), then return false.
 * >
 * > Return true.
 *
 * ASCII whitespace is U+0009 TAB, U+000A LF, U+000C FF, U+000D CR or U+0020 SPACE.
 *
 * @see https://dom.spec.whatwg.org/#valid-element-local-name
 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_IN_LOCAL_NAME = /[\t\n\f\r \0/>]/;

/**
 * Checks whether a string is a valid custom element name.
 *
 * > A string name is a valid custom element name if all of the following are true:
 *
 * > name is a valid element local name;
 *
 * > name's 0th code point is an ASCII lower alpha;
 *
 * > name does not contain any ASCII upper alphas;
 *
 * > name contains a U+002D (-); and
 *
 * > name is not one of the following: […]
 *
 * The excluded names are `annotation-xml`, `color-profile`, `font-face`,
 * `font-face-src`, `font-face-uri`, `font-face-format`, `font-face-name` and
 * `missing-glyph`.
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

		if (/[A-Z]/.test(tagName)) {
			return false;
		}

		if (!tagName.includes('-')) {
			return false;
		}

		return !FORBIDDEN_IN_LOCAL_NAME.test(tagName);
	};
};
