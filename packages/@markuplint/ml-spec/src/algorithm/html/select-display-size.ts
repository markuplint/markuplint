/**
 * The display size of a `<select>`.
 *
 * > The display size of a select element is the result of applying the rules for parsing non-negative integers to the
 * > value of the element's size attribute, if it has one and parsing it is successful. If applying those rules to the
 * > attribute's value is not successful, or if the size attribute is absent, then the element's display size is 4 if
 * > the element's multiple content attribute is present, and 1 otherwise.
 *
 * The value is whatever text the `size` attribute holds. Deciding that a template expression
 * (`:size="n"`) is not known yet is up to the caller, which has the attribute node; this function
 * reads the text as it is.
 *
 * @param size - The value of the `size` attribute, or `null` when it is absent
 * @param hasMultiple - Whether the `multiple` attribute is present
 * @returns The display size
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size
 */
export function getSelectDisplaySize(size: string | null, hasMultiple: boolean): number {
	return parseNonNegativeInteger(size) ?? (hasMultiple ? 4 : 1);
}

/**
 * The rules for parsing non-negative integers: leading ASCII whitespace is
 * skipped, an optional `+` or `-` is read, then the leading run of ASCII
 * digits; whatever follows the digits is ignored (`"3abc"` is 3, `"01"` is 1).
 * No digits, or a negative number, is an error. `-0` is not less than zero.
 *
 * @param text - The attribute value, or `null` when it is absent
 * @returns The number, or `null` for an error
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-non-negative-integers
 */
export function parseNonNegativeInteger(text: string | null): number | null {
	const match = /^[\t\n\f\r ]*([+-]?)(\d+)/.exec(text ?? '');
	if (!match) {
		return null;
	}
	const value = Number(match[2]);
	return match[1] === '-' && value !== 0 ? null : value;
}
