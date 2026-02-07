import { getWidth } from './get-width.js';

/**
 * Pads a string or number with spaces to reach the specified display width.
 * Accounts for East Asian wide characters when calculating the current width.
 *
 * @param s - The value to pad (converted to string if numeric)
 * @param pad - The target display width in terminal columns
 * @param start - When true, prepends spaces (right-aligns); otherwise appends spaces (left-aligns)
 * @returns The padded string
 */
export function pad(s: number | string, pad: number, start = false) {
	const l = getWidth(`${s}`.trim());
	const d = pad - l;
	const _ = ' '.repeat(Math.max(d, 0));
	return start ? `${_}${s}` : `${s}${_}`;
}
