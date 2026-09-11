import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html
 */
export const checkYearString: CustomSyntaxChecker = () =>
	function checkYearString(value) {
		log('CHECK: year-string');

		const tokens = TokenCollection.fromPatterns(value, [/.*/]);

		log('Year: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(datetimeTokenCheck.year, datetimeTokenCheck.extra);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};
