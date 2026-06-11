import type { FormattedPrimitiveTypeCreator } from '../types.js';

import { parse } from 'bcp-47';

/**
 * Accepts privateuse-only tags (e.g. `x-default`, common in `hreflang`)
 * in addition to ordinary language tags, because BCP 47's `Language-Tag`
 * production is `langtag / privateuse / grandfathered` — a tag with no
 * `language` subtag is still valid when it is entirely private use.
 *
 * @see https://tools.ietf.org/rfc/bcp/bcp47.html
 */
export const isBCP47: FormattedPrimitiveTypeCreator = () => {
	return value => {
		const { language, privateuse } = parse(value);
		return !!language || (privateuse != null && privateuse.length > 0);
	};
};
