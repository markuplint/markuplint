export function regexSelectorMatches(reg: string, raw: string, ignoreCase: boolean) {
	const res: Record<string, string> = {};
	const pattern = toRegxp(reg);
	const regex = new RegExp(pattern instanceof RegExp ? pattern : `^${pattern.trim()}$`, ignoreCase ? 'i' : undefined);
	const matched = regex.exec(raw);
	if (!matched) {
		return null;
	}
	matched.forEach((val, i) => (res[`$${i}`] = val));
	return {
		...res,
		...matched.groups,
	};
}

function toRegxp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return pattern;
}
