import module from 'node:module';

import c from 'cli-color';
// @ts-ignore
import eastasianwidth from 'eastasianwidth';
import stripAnsi from 'strip-ansi';
import { v4 } from 'uuid';

const require = module.createRequire(import.meta.url);

export function uuid() {
	return v4();
}

/**
 * Brand color (xTerm color)
 *
 * @see http://www.calmar.ws/vim/256-xterm-24bit-rgb-color-chart.html
 */
const PRIMARY_COLOR = 33;
const logo = `/${c.xterm(PRIMARY_COLOR)('✔')}\\`;
const version = require('../package.json').version;
const eaw: { characterLength: (char: string) => number } = eastasianwidth;

const box = (lines: readonly string[], { width = 40, padding = 1, center = false, noColor = false }) => {
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
};

export const markuplint = `markup${c.xterm(PRIMARY_COLOR)('lint')}`;

export function write(message: string) {
	process.stdout.write(message + '\n');
}

write.break = () => process.stdout.write('\n');

export function error(message: string) {
	process.stderr.write(message + '\n');
}

// eslint-disable-next-line unicorn/no-process-exit
error.exit = () => process.exit(1);

export const head = (method: string, noColor?: boolean) =>
	box([`${logo} ${markuplint}`, c.blackBright(`v${version}`), '', c.bold(method)], {
		center: true,
		noColor,
	});

export function p(s: number | string, pad: number, start = false) {
	const l = w(`${s}`.trim());
	const d = pad - l;
	const _ = ' '.repeat(d < 0 ? 0 : d);
	return start ? `${_}${s}` : `${s}${_}`;
}

export function w(s: string): number {
	return s.replace(/./g, _ => '0'.repeat(eaw.characterLength(_))).length;
}

export function space(str: string) {
	return str
		.replace(/\s+/g, $0 => {
			return c.xterm(8)($0);
		})
		.replace(/ /g, $0 => '•')
		.replace(/\t/g, $0 => '→   ');
}

export function invisibleSpace(str: string) {
	return str.replace(/\t/g, $0 => '    ').replace(/./g, $0 => ' ');
}

export function messageToString(message: string, reason?: string) {
	if (!reason) {
		return message;
	}
	return `${message} / ${reason}`;
}
