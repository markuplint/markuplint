import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * Not the same as the CSS `<color>` type — named colors, `rgb()`, `hsl()`,
 * etc. are all invalid here. Used for `input[type=color]` value validation.
 *
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-simple-colour
 */
export const isSimpleColor: FormattedPrimitiveTypeCreator = () => {
	return value => /^#[\dA-F]{6}$/i.test(value);
};
