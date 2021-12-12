import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks
 */
export const checkWeekString: CustomSyntaxChecker = () =>
	function checkWeekString(value) {
		log('CHECK: week-string');

		const tokens = TokenCollection.fromPatterns(value, [
			// YYYY
			/[^-]+/,
			// -
			/[^W]?/,
			// W
			/[^0-9]?/,
			// ww
			/.[0-9]*/,
		]);

		log('Week: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.weekSign,
			datetimeTokenCheck.week,
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};
