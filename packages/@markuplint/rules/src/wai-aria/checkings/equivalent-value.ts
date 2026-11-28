import { parseNonNegativeInteger } from '@markuplint/ml-spec';
import {
	asciiLowerCase,
	isValidFloatingPointNumber,
	isValidInteger,
	parseFloatingPointNumberValue,
	trimAsciiWhitespace,
} from '@markuplint/shared';

/**
 * Whether the value of an `aria-*` attribute is the value of its equivalent HTML attribute, compared as the value type
 * of the HTML attribute reads them: a number as a number (`max="10.0"` and `aria-valuemax="10"` are both 10), a
 * Boolean attribute by the ARIA keyword it stands for, and any other value as it is written.
 *
 * A contradiction is a different value, not a different spelling of one: the native attribute and the `aria-*`
 * attribute are compared for the semantics they give, which the native one decides:
 *
 * > when HTML elements use both aria-* attributes and their host language (HTML) equivalents, user agents MUST ignore the WAI-ARIA attributes – the native HTML attributes with the same implicit ARIA semantics take precedence.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance-attr
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-floating-point-number-values
 * @param ariaValue - The value of the `aria-*` attribute
 * @param nativeValue - The value of the HTML attribute, or null when the element does not have it
 * @param nativeType - The value type of the HTML attribute (`Attribute#type` of `@markuplint/ml-spec`)
 * @param nativeName - The name of the HTML attribute
 * @param equivalentValue - The ARIA keyword that the presence of a Boolean HTML attribute stands for, or null when the
 *   value of the HTML attribute is the equivalent
 * @returns Whether the two are the same value
 */
export function isSameAsNative(
	ariaValue: string,
	nativeValue: string | null,
	nativeType: unknown,
	nativeName: string,
	equivalentValue: string | null | undefined,
): boolean {
	if (equivalentValue != null) {
		// A keyword as browsers read it: ASCII case-insensitively, not trimmed
		return asciiLowerCase(ariaValue) === equivalentValue;
	}
	if (nativeValue == null) {
		return false;
	}
	// An ARIA number is the whole of the value with ASCII white space around it trimmed (`isValidAriaValueType`)
	const aria = trimAsciiWhitespace(ariaValue);
	switch (numberKind(nativeType)) {
		case 'integer': {
			const native = parseIntegerValue(nativeValue, nativeType, nativeName);
			return native !== null && isValidInteger(aria) && native === Number(aria);
		}
		case 'float': {
			const native = parseFloatingPointNumberValue(nativeValue);
			return native !== null && isValidFloatingPointNumber(aria) && native === Number(aria);
		}
		default: {
			return ariaValue === nativeValue;
		}
	}
}

/**
 * The integer that a browser reads from a value of the integer type: the rules for parsing integers (a sign allowed)
 * or non-negative integers, then the upper bound of the type, as the browser normalizes `colspan` (0 is 1, and more
 * than 1000 is 1000) and `rowspan` (more than 65534 is 65534; 0 spans to the end of the row group, which it stays).
 * The upper bound is the `lte` of the value type in the spec data, which is the clamp of the browser for these two
 * attributes; the 0 of `colspan` is the one rule that the type does not say.
 *
 * @see https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-colspan
 * @param value - The value of the HTML attribute
 * @param type - Its value type
 * @param name - The name of the HTML attribute
 * @returns The integer, or null when the value has none
 */
function parseIntegerValue(value: string, type: unknown, name: string): number | null {
	const bounds = type !== null && typeof type === 'object' ? (type as { lte?: number }) : {};
	const parsed =
		type === 'Int'
			? (() => {
					const match = /^[\t\n\f\r ]*([+-]?\d+)/.exec(value);
					return match?.[1] === undefined ? null : Number(match[1]);
				})()
			: parseNonNegativeInteger(value);
	if (parsed === null) {
		return null;
	}
	let n = parsed;
	if (name === 'colspan' && n === 0) {
		n = 1;
	}
	if (bounds.lte !== undefined && n > bounds.lte) {
		n = bounds.lte;
	}
	return n;
}

/**
 * @param type - The value type of an HTML attribute
 * @returns Whether it is a number, and of which kind
 */
function numberKind(type: unknown): 'integer' | 'float' | null {
	if (type === 'Int' || type === 'Uint') {
		return 'integer';
	}
	if (type === 'Number') {
		return 'float';
	}
	if (type !== null && typeof type === 'object' && 'type' in type) {
		if (type.type === 'integer') {
			return 'integer';
		}
		if (type.type === 'float') {
			return 'float';
		}
	}
	return null;
}
