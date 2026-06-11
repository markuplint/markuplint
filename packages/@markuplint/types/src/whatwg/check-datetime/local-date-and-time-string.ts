import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

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
			/\D?/,
			// MM
			/[^-]*/,
			// -
			/\D?/,
			// DD
			/[^\sT]*/,
			// T
			/\D?/,
			// hh
			/[^:]*/,
			// :
			/\D?/,
			// mm
			/[^:]*/,
			// :
			/\D?/,
			// ss
			/[^.]*/,
			// .
			/\D?/,
			// sss
			/.\d*/,
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
			datetimeTokenCheck.colon,
			datetimeTokenCheck.minute,
			datetimeTokenCheck.colonOrEnd,
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
			/\D?/,
			// MM
			/[^-]*/,
			// -
			/\D?/,
			// DD
			/[^T]*/,
			// T
			/\D?/,
			// hh
			/[^:]*/,
			// :
			/\D?/,
			// mm
			/[^:]*/,
			// :
			/\D?/,
			// ss
			/[^.]*/,
			// .
			/\D?/,
			// sss
			/.\d*/,
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
			datetimeTokenCheck.colon,
			datetimeTokenCheck.minute,
			datetimeTokenCheck.colonOrEnd,
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
		const second = tokens[10];
		const fp = tokens[12];

		if (!second || !fp) {
			log('Failed: %O', res);
			return res;
		}

		const _second = second.toNumber();
		const _fp = fp.toNumber();

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
