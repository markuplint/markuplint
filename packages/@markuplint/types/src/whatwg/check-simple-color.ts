import type { FormattedPrimitiveTypeCreator } from '../types.js';

import { cssSyntaxMatch } from '../css-syntax.js';

/**
 * Checks the `value` attribute of `input[type=color]`.
 *
 * > The value attribute, if specified and not the empty string, must have a value that is a CSS color.
 *
 * So the value is any CSS `<color>`: `#rrggbb`, `#rgb`, `#rrggbbaa`, named colors,
 * `rgb()`, `hsl()`, `oklch()`, `color()` and so on. The sentence makes no exception, so
 * `currentcolor`, `transparent` and the system colors are accepted too. The `alpha` and `colorspace`
 * attributes only decide how the control serializes the color, so they do not
 * restrict the value here. The empty string is not accepted (an empty
 * attribute is "not specified" for the author, and the type check does not run
 * on it).
 *
 * The name `SimpleColor` is kept from the former "valid simple colour" definition.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)
 */
export const isSimpleColor: FormattedPrimitiveTypeCreator = () => {
	return value => value !== '' && cssSyntaxMatch(value, '<color>').matched;
};
