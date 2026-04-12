import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * Checks whether a string is a valid email address per the HTML spec.
 *
 * The regex below is the **verbatim** pattern from the HTML Living Standard.
 * It intentionally uses explicit ASCII ranges (`[a-zA-Z0-9]`) instead of `\w`
 * because the spec restricts valid characters to ASCII only. `\w` is equivalent
 * to `[a-zA-Z0-9_]` in non-Unicode mode, but using the spec's literal ranges
 * ensures correctness regardless of future regex flag changes and makes it
 * easy to verify against the spec text.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
 */
/* eslint-disable regexp/prefer-w -- verbatim from HTML spec; keep ASCII-explicit for spec fidelity */
const validEmailPattern =
	/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
/* eslint-enable regexp/prefer-w */

export const isEmail: FormattedPrimitiveTypeCreator = () => {
	return value => validEmailPattern.test(value);
};
