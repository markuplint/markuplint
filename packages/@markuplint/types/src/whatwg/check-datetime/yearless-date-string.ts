import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#yearless-dates
 */
export const checkYearlessDateString: CustomSyntaxChecker = () =>
	function checkYearlessDateString(value) {
		log('CHECK: yearless-date-string');

		const tokens = TokenCollection.fromPatterns(value, [
			// MM
			/[^-]*/,
			// -
			/[^0-9]?/,
			// DD
			/.[0-9]*/,
		]);

		log('Yearless Date: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
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
