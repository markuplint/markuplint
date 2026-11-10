import type { FormattedPrimitiveTypeCreator } from '../types.js';

/**
 * @see https://infra.spec.whatwg.org/#ascii-tab-or-newline
 *
 * > An ASCII tab or newline is U+0009 TAB, U+000A LF, or U+000D CR.
 */
const TAB_OR_NEWLINE = /[\t\n\r]/;

/**
 * Whether a name contains both an ASCII tab or newline and a U+003C (<): what the valid navigable target name
 * rejects below, and what makes the `base` element's `target` fall back to `_blank`.
 */
export function hasTabOrNewlineAndLessThan(value: string): boolean {
	return TAB_OR_NEWLINE.test(value) && value.includes('<');
}

/**
 * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable-target-names
 *
 * > A valid navigable target name is any string with at least one character
 * > that does not contain both an ASCII tab or newline and a U+003C (<),
 * > and it does not start with a U+005F (_).
 * > (Names starting with a U+005F (_) are reserved for special keywords.)
 */
export const isNavigableTargetName: FormattedPrimitiveTypeCreator = () => {
	return value => {
		return !!value && !hasTabOrNewlineAndLessThan(value) && value[0] !== '_';
	};
};
