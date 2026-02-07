/**
 * Converts all visible characters in a string to spaces, preserving
 * the visual width. Tabs are expanded to four spaces before conversion.
 * Useful for generating indentation-preserving blank lines in CLI output.
 *
 * @param str - The input string whose characters will be replaced with spaces
 * @returns A string of the same visual length consisting only of space characters
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
