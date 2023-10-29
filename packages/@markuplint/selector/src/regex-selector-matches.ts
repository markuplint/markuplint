export function regexSelectorMatches(reg: string, raw: string, ignoreCase: boolean) {
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
