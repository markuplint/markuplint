import c from 'picocolors';

/**
 * Creates a curried function that applies an xTerm 256-color foreground color
 * to the given text using ANSI escape sequences. Falls back to plain text
 * when color output is not supported.
 *
 * @param index - The xTerm 256-color palette index (0-255)
 * @returns A function that wraps the given text with the specified color escape codes
 */
export const xterm = (index: number) => (text: string) => {
	// https://github.com/jaywcjlove/colors-cli/blob/d3a3152ec2f087c46655e7d2a663ef637ed5fea5/lib/color.js#L121
	return c.isColorSupported ? '\u001B[38;5;' + index + 'm' + text + '\u001B[0m' : text;
};
