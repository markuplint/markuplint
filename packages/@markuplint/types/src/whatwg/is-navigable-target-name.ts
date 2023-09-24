import type { FormattedPrimitiveTypeCreator } from '../types';

/**
 * @see https://infra.spec.whatwg.org/#ascii-tab-or-newline
 *
 * > An ASCII tab or newline is U+0009 TAB, U+000A LF, or U+000D CR.
 */
const TAB_OR_NEWLINE = /[\t\n\r]/;

/**
 * @see https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name
 *
 * > A valid navigable target name is any string with at least one character
 * > that does not contain both an ASCII tab or newline and a U+003C (<),
 * > and it does not start with a U+005F (_).
 * > (Names starting with a U+005F (_) are reserved for special keywords.)
 *
 */
export const isNavigableTargetName: FormattedPrimitiveTypeCreator = () => {
	return value => {
		return !!value && !TAB_OR_NEWLINE.test(value) && value[0] !== '_';
	};
};
