import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

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
			/\D?/,
			// DD
			/.\d*/,
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
