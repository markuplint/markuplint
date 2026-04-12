import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * Checks whether a string is a valid simple color.
 *
 * A valid simple color is exactly seven characters long:
 * a U+0023 NUMBER SIGN (#) followed by six ASCII hex digits.
 *
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-simple-colour
 */
export const isSimpleColor: FormattedPrimitiveTypeCreator = () => {
	return value => /^#[\dA-F]{6}$/i.test(value);
};
