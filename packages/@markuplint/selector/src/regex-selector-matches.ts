/**
 * Tests a raw string value against a regex selector pattern and returns
 * the captured groups if matched.
 *
 * Plain strings are treated as exact-match patterns (`^pattern$`).
 * Regex literals (`/pattern/flags`) are used as-is.
 *
 * @param reg - The regex pattern string, or `undefined` to skip matching
 * @param raw - The raw string value to test against the pattern
 * @param ignoreCase - Whether to perform case-insensitive matching
 * @returns An object of captured groups (`$0`, `$1`, ... and named groups), or `null` if unmatched or `reg` is `undefined`
 */
export function regexSelectorMatches(reg: string | undefined, raw: string, ignoreCase: boolean) {
	if (!reg) {
		return null;
	}

	const res: Record<string, string> = {};
	const pattern = toRegexp(reg);
	const regex = new RegExp(pattern instanceof RegExp ? pattern : `^${pattern.trim()}$`, ignoreCase ? 'i' : undefined);
	const matched = regex.exec(raw);
	if (!matched) {
		return null;
	}
	for (const [i, val] of matched.entries()) res[`$${i}`] = val;
	return {
		...res,
		...matched.groups,
	};
}

function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([gi]*)$/i);
	if (matched && matched[1]) {
		return new RegExp(matched[1], matched[2]);
	}
	return pattern;
}
