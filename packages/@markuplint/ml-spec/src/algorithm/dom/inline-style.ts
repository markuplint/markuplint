/**
 * Whether the `style` attribute of an element sets `display: none` or `visibility: hidden`, the two
 * declarations of the markup that hide an element from all users.
 *
 * Known limitation: it matches the text of the attribute, so a shorthand property, `!important` and a
 * value inside a comment or a string are not read as a CSS declaration parser would read them.
 *
 * @param el - An element
 * @returns `true` when the inline style hides the element
 * @see https://w3c.github.io/aria/#tree_exclusion
 */
export function hasDisplayNoneOrVisibilityHiddenStyle(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	const style = el.getAttribute('style');
	if (!style) {
		return false;
	}
	return /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style);
}
