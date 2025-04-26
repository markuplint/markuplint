import { getWidth } from './get-width.js';

export function pad(s: number | string, pad: number, start = false) {
	const l = getWidth(`${s}`.trim());
	const d = pad - l;
	const _ = ' '.repeat(Math.max(d, 0));
	return start ? `${_}${s}` : `${s}${_}`;
}
