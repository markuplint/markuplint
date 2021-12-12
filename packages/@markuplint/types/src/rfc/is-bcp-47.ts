import type { FormattedPrimitiveTypeCreator } from '../types';

import { parse } from 'bcp-47';

/**
 * @see https://tools.ietf.org/rfc/bcp/bcp47.html
 */
export const isBCP47: FormattedPrimitiveTypeCreator = () => {
	return value => {
		const { language } = parse(value);
		return !!language;
	};
};
