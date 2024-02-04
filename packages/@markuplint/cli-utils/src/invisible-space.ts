/**
 * Convert all characters to space.
 *
 * @param str
 * @returns
 */
export function invisibleSpace(str: string) {
	return (
		str
			// Tab to 4 spaces
			.replaceAll('\t', () => '    ')
			// All characters to space
			.replaceAll(/./g, () => ' ')
	);
}
