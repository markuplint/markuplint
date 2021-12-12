import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

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
