import type { AccnameElement } from '../algorithm/aria/accname/types.js';

/**
 * ARIA roles that are embedded controls per AccName Step 2C.
 * @see https://www.w3.org/TR/accname-1.2/#comp_embedded_control
 */
export const EMBEDDED_CONTROL_ROLES: ReadonlySet<string> = new Set([
	'textbox',
	'combobox',
	'listbox',
	'spinbutton',
	'slider',
	'searchbox',
]);

/**
 * Input types using label → title → placeholder name computation (HTML-AAM §4.1).
 */
export const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
	'text',
	'password',
	'search',
	'tel',
	'url',
	'email',
	'number',
	'date',
	'month',
	'week',
	'time',
	'datetime-local',
	'color',
	'range',
	'file',
]);

/**
 * Input types that behave as text-like controls (value attr → textContent).
 * Subset of TEXT_INPUT_TYPES used for embedded control value extraction.
 */
export const TEXT_LIKE_INPUT_TYPES: ReadonlySet<string> = new Set([
	'text',
	'search',
	'tel',
	'url',
	'email',
	'password',
	'number',
]);

/** Default accessible name for input[type=submit] per HTML-AAM §4.1 */
export const DEFAULT_SUBMIT_LABEL = 'Submit';

/** Default accessible name for input[type=reset] per HTML-AAM §4.1 */
export const DEFAULT_RESET_LABEL = 'Reset';

/** Default accessible name for input[type=image] per HTML-AAM §4.1 */
export const DEFAULT_IMAGE_LABEL = 'Submit Query';

/**
 * Checks if a native HTML element is an embedded control (without role resolution).
 * Centralizes the logic duplicated across accname-computation.ts, ml-core/accname.ts, test-helpers.ts.
 *
 * @param el - The element to check
 * @returns True if the element is a native embedded control (textarea, select, or input with a value-producing type)
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function isNativeEmbeddedControl(el: AccnameElement): boolean {
	const { localName } = el;
	if (localName === 'textarea' || localName === 'select') {
		return true;
	}
	if (localName === 'input') {
		const type = (el.getAttribute('type') ?? 'text').toLowerCase();
		return (
			type !== 'hidden' &&
			type !== 'button' &&
			type !== 'submit' &&
			type !== 'reset' &&
			type !== 'image' &&
			type !== 'checkbox' &&
			type !== 'radio'
		);
	}
	return false;
}
