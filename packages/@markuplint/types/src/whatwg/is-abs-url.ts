import type { FormattedPrimitiveTypeCreator } from '../types';

/**
 * @see https://url.spec.whatwg.org/#syntax-url-absolute
 *
 * > An absolute-URL string must be one of the following:
 * > - a URL-scheme string that is an ASCII case-insensitive match
 * >   for a special scheme and not an ASCII case-insensitive match for "file",
 * >   followed by U+003A (:) and a scheme-relative-special-URL string
 * > - a URL-scheme string that is not an ASCII case-insensitive match
 * >   for a special scheme, followed by U+003A (:) and a relative-URL string
 * > - a URL-scheme string that is an ASCII case-insensitive match for "file",
 * >   followed by U+003A (:) and a scheme-relative-file-URL string
 *
 */
export const isAbsURL: FormattedPrimitiveTypeCreator = () => {
	return value => {
		try {
			new URL(value);
		} catch (e: unknown) {
			if (e && typeof e === 'object' && 'code' in e) {
				// @ts-ignore
				if (e.code === 'ERR_INVALID_URL') {
					return false;
				}
			}
			throw e;
		}
		return true;
	};
};
