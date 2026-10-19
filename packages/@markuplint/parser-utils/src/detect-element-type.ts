import type { ElementType, ParserAuthoredElementNameDistinguishing } from '@markuplint/ml-ast';

import { isPotentialCustomElementName } from './decision.js';

export function detectElementType(
	name: string,
	option?: ParserAuthoredElementNameDistinguishing,
	defaultPattern?: ParserAuthoredElementNameDistinguishing,
): ElementType {
	if (distinguishAuthoredName(name, option, defaultPattern)) {
		return 'authored';
	}
	return isPotentialCustomElementName(name) ? 'web-component' : 'html';
}

function distinguishAuthoredName(
	name: string,
	pattern?: ParserAuthoredElementNameDistinguishing,
	defaultPattern?: ParserAuthoredElementNameDistinguishing,
) {
	if (pattern != null) {
		return _distinguishAuthoredName(name, pattern);
	}

	if (defaultPattern != null) {
		return _distinguishAuthoredName(name, defaultPattern);
	}

	return false;
}

function _distinguishAuthoredName(name: string, patterns: ParserAuthoredElementNameDistinguishing) {
	const patternList = Array.isArray(patterns) ? patterns : [patterns];

	return patternList.some(pattern => {
		if (typeof pattern === 'function') {
			return pattern(name);
		}
		if (typeof pattern === 'string') {
			const regex = toRegexp(pattern);
			return regex ? regex.test(name) : name === pattern;
		}
		return pattern.test(name);
	});
}

/**
 * A string in the form of a regular expression literal (`/^[A-Z]/i`, with the flags `g` and `i` at most) is that regular
 * expression. Any other string is a name, and stands for the whole name only: `component`
 * is `<component>`, not `<my-component>` nor `<components>`, and a character such as `.`
 * is that character. So a name is written as it is, as in the examples of `authoredElementName`.
 *
 * @returns The regular expression, or `null` for a name
 */
function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([gi]*)$/i);
	if (matched && matched[1]) {
		return new RegExp(matched[1], matched[2]);
	}
	return null;
}
