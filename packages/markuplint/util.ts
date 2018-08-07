export function toRegxp(pattern: string) {
	if (/^\/.+\/[ig]*$/i) {
		const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
		if (matched) {
			return new RegExp(matched[1], matched[2]);
		}
	}
	return pattern;
}
