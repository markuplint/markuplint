import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates
 */
export const checkDateString: CustomSyntaxChecker = () =>
	function checkDateString(value) {
		log('CHECK: date-string');

		const tokens = TokenCollection.fromPatterns(value, [
			// YYYY
			/[^-]*/,
			// -
			/[^0-9]?/,
			// MM
			/[^-]*/,
			// -
			/[^0-9]/,
			// DD
			/.[0-9]*/,
		]);

		log('Date: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.month,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.date,
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};
