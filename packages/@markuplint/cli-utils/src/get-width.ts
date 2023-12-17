// @ts-ignore
import eastasianwidth from 'eastasianwidth';

const eaw: { characterLength: (char: string) => number } = eastasianwidth;

export function getWidth(s: string): number {
	return s.replaceAll(
		// All characters
		/./g,
		// Wide characters to multi dots
		char =>
			'•'.repeat(
				// Get the number of character width
				eaw.characterLength(char),
			),
	).length;
}
