import { xterm } from './color.js';

/**
 * Replaces whitespace characters with visible symbols for debugging display.
 * Spaces become middle dots (`\u2022`) and tabs become right arrows (`\u2192`) followed
 * by three spaces. All whitespace is dimmed using xTerm color 8.
 *
 * @param str - The input string containing whitespace to visualize
 * @returns The string with whitespace replaced by visible indicator characters
 */
export function space(str: string) {
	return str
		.replaceAll(/\s+/g, $0 => xterm(8)($0))
		.replaceAll(' ', $0 => '•')
		.replaceAll('\t', $0 => '→   ');
}
