import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#dates
 */
export const checkDateString: CustomSyntaxChecker = () =>
	function checkDateString(value) {
		if (log.enabled) {
			log('CHECK: date-string');
		}

		const tokens = TokenCollection.fromPatterns(value, [
			// YYYY
			/[^-]*/,
			// -
			/\D?/,
			// MM
			/[^-]*/,
			// -
			/\D/,
			// DD
			/.\d*/,
		]);

		if (log.enabled) {
			log('Date: "%s" => %O', tokens.value, tokens);
		}

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.month,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.date,
			datetimeTokenCheck.extra,
		);

		if (!res.matched && log.enabled) {
			log('Failed: %O', res);
		}

		return res;
	};
