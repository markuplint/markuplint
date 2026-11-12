/**
 * Marks a value so that the translator of `@markuplint/i18n` shows it as written.
 *
 * The translator looks a placeholder's value up as a keyword (`list` is `リスト` with `locale: 'ja'`),
 * and so it does each item of a list, `t(['row', 'list'])`. A placeholder written `{n*}` is not
 * translated, but a list has no such mark: an item that is data (a role name, an attribute value, a
 * token the author wrote) is wrapped in `%…%`, the translator's own form of "not a keyword".
 *
 * The translator reads `%…%` around a whole value as that mark and `%%` at an end as one `%`, so a
 * value that has a `%` at an end is written with it doubled: `%list%` is shown as `%list%`, not
 * `list`. A `%` inside a value needs nothing, as no keyword has one. An empty value is returned as
 * it is: wrapped, `%%` would be read back as a stray `%`.
 *
 * @param value - The text to show as written
 * @returns The text for an item of a list, or for a placeholder, given to `t()`
 */
export function noTranslate(value: string): string {
	if (value === '') {
		return value;
	}
	if (!value.includes('%')) {
		return `%${value}%`;
	}
	// `%%` is the escaped form of one `%` at an end, so a lone `%` is a single escaped one
	if (value === '%') {
		return '%%';
	}
	return value.replace(/^%/, '%%').replace(/%$/, '%%');
}
