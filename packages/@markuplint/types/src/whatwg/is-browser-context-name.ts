import type { FormattedPrimitiveTypeCreator } from '../types';

/**
 *
 * @see https://html.spec.whatwg.org/multipage/browsers.html#valid-browsing-context-name
 *
 * > A valid browsing context name is any string with at least one character
 * > that does not start with a U+005F LOW LINE character.
 * > (Names starting with an underscore are reserved for special keywords.)
 *
 */
export const isBrowserContextName: FormattedPrimitiveTypeCreator = () => {
	return value => {
		return !!value && value[0] !== '_';
	};
};
