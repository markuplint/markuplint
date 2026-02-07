/**
 * Calculates the character offset in a string from a 1-based line number
 * and 1-based column number. Handles multi-byte characters correctly
 * by splitting lines into individual characters.
 *
 * @param str - The source string to compute the offset within
 * @param line - The 1-based line number
 * @param col - The 1-based column number
 * @returns The 0-based character offset corresponding to the given line and column
 */
export function getOffsetFromLineAndCol(str: string, line: number, col: number) {
	const lines = str.split('\n').slice(0, line);
	const lastLine = lines.pop();
	if (lastLine) {
		lines.push([...lastLine].slice(0, col).join(''));
	}
	return lines.join('\n').length;
}
