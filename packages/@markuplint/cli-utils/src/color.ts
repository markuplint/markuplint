import c from 'picocolors';

export const xterm = (index: number) => (text: string) => {
	// https://github.com/jaywcjlove/colors-cli/blob/d3a3152ec2f087c46655e7d2a663ef637ed5fea5/lib/color.js#L121
	return c.isColorSupported ? '\u001B[38;5;' + index + 'm' + text + '\u001B[0m' : text;
};
