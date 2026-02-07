// @ts-ignore
import eastasianwidth from 'eastasianwidth';

const eaw: { characterLength: (char: string) => number } = eastasianwidth;

/**
 * Calculates the visual display width of a string, accounting for
 * East Asian wide characters that occupy two columns in a terminal.
 *
 * @param s - The string to measure
 * @returns The total display width in terminal columns
 */
export function getWidth(s: string): number {
	let width = 0;
	for (const char of s) {
		// Get the number of character width per Unicode code point
		width += eaw.characterLength(char);
	}
	return width;
}
