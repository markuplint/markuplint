import { xterm } from './color.js';

/**
 * Replace space to visible characters.
 *
 * @param str
 * @returns
 */
export function space(str: string) {
	return str
		.replaceAll(/\s+/g, $0 => xterm(8)($0))
		.replaceAll(' ', $0 => '•')
		.replaceAll('\t', $0 => '→   ');
}
