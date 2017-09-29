import * as parse5 from 'parse5';

export function verify (html: string) {
	const doc = parse5.parse(html, { locationInfo: true });
}
