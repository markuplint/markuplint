import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { unmatched } from '../../match-result';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';
import { parseTimeZone } from './time-zone-offset-string';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#global-dates-and-times
 */
export const checkGlobalDateAndTimeString: CustomSyntaxChecker = () =>
	function checkGlobalDateAndTimeString(value) {
		log('CHECK: global-date-and-time-string');

		const tokens = TokenCollection.fromPatterns(value, [
			// YYYY
			/[^-]*/,
			// -
			/[^0-9]?/,
			// MM
			/[^-]*/,
			// -
			/[^0-9]?/,
			// DD
			/[^T\s]*/,
			// T \s
			/[^0-9]?/,
			// hh
			/[^:]*/,
			// :
			/[^0-9]?/,
			// mm
			/[^:Z+-]*/,
			// :ss.sss
			/(:[^Z+-]*)?/,
			// time-zone
			/.*/,
		]);

		log('Global Date and Time "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.month,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.date,
			datetimeTokenCheck.localDateTimeSeparator,
			datetimeTokenCheck.hour,
			datetimeTokenCheck.coron,
			datetimeTokenCheck.minute,
			second => {
				if (!second || !second.value) {
					return;
				}

				const secondTokens = TokenCollection.fromPatterns(second, [/:?/, /[0-9]*/, /\.?/, /[0-9]*/]);

				log('Scond Part: "%s" => %O', secondTokens.value, secondTokens);

				const res = secondTokens.eachCheck(
					datetimeTokenCheck.coron,
					datetimeTokenCheck.second,
					datetimeTokenCheck.decimalPointOrEnd,
					datetimeTokenCheck.secondFractionalPart,
				);

				if (!res.matched) {
					return res;
				}
			},
			zone => {
				if (!zone || !zone.value) {
					return unmatched(value, 'missing-token', {
						expects: [{ type: 'common', value: 'time-zone' }],
						partName: 'time-zone',
					});
				}

				const res = parseTimeZone(zone);

				if (!res.matched) {
					return res;
				}
			},
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};
