import type { FormattedPrimitiveTypeCreator } from '../types';

/**
 *
 * @see https://html.spec.whatwg.org/multipage/microdata.html#defined-property-name
 *
 * > The rules above disallow U+003A COLON characters (:) in non-URL values
 * > because otherwise they could not be distinguished from URLs.
 * > Values with U+002E FULL STOP characters (.) are reserved for future extensions.
 * > ASCII whitespace are disallowed because otherwise the values would be parsed as multiple tokens.
 *
 */
export const isItempropName: FormattedPrimitiveTypeCreator = () => {
	return value => {
		return value.indexOf(':') === -1 && value.indexOf('.') === -1 && value.indexOf(' ') === -1;
	};
};
