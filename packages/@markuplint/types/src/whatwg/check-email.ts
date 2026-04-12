import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * The regular expression for a valid email address as defined by the HTML spec.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 */
// Based on the HTML spec pattern for valid email addresses.
// Uses \w where possible to satisfy regexp/prefer-w.
const validEmailPattern = /^[\w.!#$%&'*+/=?^`{|}~-]+@\w(?:[\w-]{0,61}\w)?(?:\.\w(?:[\w-]{0,61}\w)?)*$/;

/**
 * Checks whether a string is a valid email address per the HTML spec.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 */
export const isEmail: FormattedPrimitiveTypeCreator = () => {
	return value => validEmailPattern.test(value);
};
