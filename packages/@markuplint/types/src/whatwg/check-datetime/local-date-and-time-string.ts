import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-local-date-and-time-string
 */
export const checkLocalDateAndTimeString: CustomSyntaxChecker = () =>
	function checkLocalDateAndTimeString(value) {
		log('CHECK: local-date-and-time-string');

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
			// T
			/[^0-9]?/,
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

		log('Local Date and Time: "%s" => %O', tokens.value, tokens);

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
			datetimeTokenCheck.coronOrEnd,
			datetimeTokenCheck.second,
			datetimeTokenCheck.decimalPointOrEnd,
			datetimeTokenCheck.secondFractionalPart,
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-normalised-local-date-and-time-string
 */
export const checkNormalizedLocalDateAndTimeString: CustomSyntaxChecker = () =>
	function checkNormalizedLocalDateAndTimeString(value) {
		log('CHECK: normalized-local-date-and-time-string');

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
			/[^T]*/,
			// T
			/[^0-9]?/,
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

		log('Normalized Local Date and Time: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			datetimeTokenCheck.year,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.month,
			datetimeTokenCheck.hyphen,
			datetimeTokenCheck.date,
			datetimeTokenCheck.normalizedlocalDateTimeSeparator,
			datetimeTokenCheck.hour,
			datetimeTokenCheck.coron,
			datetimeTokenCheck.minute,
			datetimeTokenCheck.coronOrEnd,
			datetimeTokenCheck.second,
			datetimeTokenCheck.decimalPointOrEnd,
			datetimeTokenCheck.secondFractionalPart,
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
			return res;
		}

		/**
		 * > A valid time string representing the time,
		 * > expressed as the shortest possible string for the given time
		 * > (e.g. omitting the seconds component entirely
		 * > if the given time is zero seconds past the minute)
		 */
		const [, , , , , , , , , , second, , fp] = tokens;

		const _second = second.toNumber() || 0;
		const _fp = fp.toNumber() || 0;

		log('Omitting the seconds component: "%s.%s" => %d, %d', second?.value, fp?.value, _second, _fp);

		if (second.value && _second === 0 && (!fp.value || (fp.value && _fp === 0))) {
			const res = second.unmatched({
				partName: 'second',
				reason: 'extra-token',
			});
			log('Failed: %O', res);
			return res;
		}

		if (fp.value && _fp === 0) {
			const res = fp.unmatched({
				partName: 'fractional part',
				reason: 'extra-token',
			});
			log('Failed: %O', res);
			return res;
		}

		log('Failed: %O', res);
		return res;
	};
