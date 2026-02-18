import type { FormattedPrimitiveTypeCreator } from '../types.js';

import { parse } from 'bcp-47';

/**
 * Checks whether a string is a valid BCP 47 language tag.
 *
 * @see https://tools.ietf.org/rfc/bcp/bcp47.html
 */
export const isBCP47: FormattedPrimitiveTypeCreator = () => {
	return value => {
		const { language, privateuse } = parse(value);
		return !!language || (privateuse != null && privateuse.length > 0);
	};
};
