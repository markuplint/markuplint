import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks
 */
export const checkWeekString: CustomSyntaxChecker = () =>
	function checkWeekString(value) {
		if (log.enabled) {
			log('CHECK: week-string');
		}

		const tokens = TokenCollection.fromPatterns(value, [
			// YYYY
			/[^-]+/,
			// -
			/[^W]?/,
			// W
			/\D?/,
			// ww
			/.\d*/,
		]);

		if (log.enabled) {
			log('Week: "%s" => %O', tokens.value, tokens);
		}

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.weekSign,
			datetimeTokenCheck.week,
			datetimeTokenCheck.extra,
		);

		if (!res.matched && log.enabled) {
			log('Failed: %O', res);
		}

		return res;
	};
