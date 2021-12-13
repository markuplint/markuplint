import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#times
 */
export const checkTimeString: CustomSyntaxChecker = () =>
	function checkTimeString(value) {
		log('CHECK: time-string');

		const tokens = TokenCollection.fromPatterns(value, [
			// hh
			/[^:]*/,
			// :
			/[^0-9]?/,
			// mm
			/[^:]*/,
			// :
			/[^0-9]?/,
			// ss
			/[^.]*/,
			// .
			/[^0-9]?/,
			// sss
			/.[0-9]*/,
		]);

		log('Time: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			datetimeTokenCheck.hour,
			datetimeTokenCheck.coron,
			datetimeTokenCheck.minute,
			datetimeTokenCheck.coronOrEnd,
			datetimeTokenCheck.second,
			datetimeTokenCheck.decimalPointOrEnd,
			datetimeTokenCheck.secondFractionalPart,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};
