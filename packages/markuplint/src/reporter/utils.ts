import c from 'cli-color';
// @ts-ignore
import eastasianwidth from 'eastasianwidth';

export const markuplint = `markup${c.xterm(39)('lint')}`;
const eaw: { characterLength: (char: string) => number } = eastasianwidth;

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
