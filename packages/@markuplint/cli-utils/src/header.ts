import module from 'node:module';

import c from 'picocolors';
import stripAnsi from 'strip-ansi';

import { logo } from './logo.js';
import { name } from './name.js';

const require = module.createRequire(import.meta.url);
const version = require('../package.json').version;

export const header = (subCommandName: string, noColor?: boolean) =>
	box(
		[
			// Logo and name
			`${logo} ${name}`,
			// Version
			c.blackBright(`v${version}`),
			// Break line
			'',
			// Command name
			c.bold(subCommandName),
		],
		{
			center: true,
			noColor,
		},
	);

function box(lines: readonly string[], { width = 40, padding = 1, center = false, noColor = false }) {
	const bt = `┌${'─'.repeat(width - 2)}┐`;
	const pd = `│${' '.repeat(width - 2)}│`;
	const bb = `└${'─'.repeat(width - 2)}┘`;
	const texts = lines.map(line => {
		const nc = stripAnsi(line);
		const length = nc.length;
		const pad = width - 2 - 1 - length;
		const pad2 = Math.floor(pad / 2);
		const padD = pad % 2;
		const padL = center ? pad2 : 0;
		const padR = center ? pad2 + padD : pad;
		const text = noColor ? nc : line;
		return `│ ${' '.repeat(padL)}${text}${' '.repeat(padR)}│`;
	});
	const result = [bt, pd, ...texts, pd, bb];
	return result.join('\n');
}
