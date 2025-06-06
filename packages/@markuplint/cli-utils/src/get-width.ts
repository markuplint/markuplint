// @ts-ignore
import eastasianwidth from 'eastasianwidth';

const eaw: { characterLength: (char: string) => number } = eastasianwidth;

export function getWidth(s: string): number {
	let width = 0;
	for (const char of s) {
		// Get the number of character width per Unicode code point
		width += eaw.characterLength(char);
	}
	return width;
}
