import type { Token } from '../../token/index.js';
import type { CustomSyntaxChecker } from '../../types.js';

import { log } from '../../debug.js';
import { matched, unmatched } from '../../match-result.js';
import { TokenCollection } from '../../token/index.js';

import { datetimeTokenCheck } from './datetime-tokens.js';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#time-zones
 */
export const checkTimeZoneOffsetString: CustomSyntaxChecker = () =>
	function checkTimeZoneOffsetString(value) {
		log('CHECK: time-zone-offset-string');

		return parseTimeZone(value);
	};

export function parseTimeZone(zone: string | Readonly<Token>) {
	const value = typeof zone === 'string' ? zone : zone.value;

	const zoneTokens = TokenCollection.fromPatterns(zone, [
		// Z + -
		/\D?/,
		// hh
		/[^:]{0,2}/,
		// :
		/\D?/,
		// mm
		/.\d*/,
	]);

	log('Time-zone Part: "%s" => %O', value, zoneTokens);

	const res = zoneTokens.eachCheck(
		(sign, tail) => {
			if (!sign || !sign.value) {
				return unmatched(value, 'missing-token', {
					expects: [
						{ type: 'const', value: 'Z' },
						{ type: 'const', value: '+' },
						{ type: 'const', value: '-' },
					],
					partName: 'time-zone',
				});
			}

			if (sign.matches('Z')) {
				if (tail.value) {
					return (
						tail[0]?.unmatched({
							reason: 'extra-token',
						}) ?? unmatched(tail.value, 'extra-token')
					);
				}

				return matched();
			}

			if (!sign.matches(['+', '-'])) {
				return sign.unmatched({
					reason: 'unexpected-token',
					expects: [
						{ type: 'const', value: '+' },
						{ type: 'const', value: '-' },
					],
					partName: 'time-zone',
				});
			}
		},
		datetimeTokenCheck.hour,
		colon => {
			if (!colon || !colon.value) {
				return;
			}

			if (!colon.matches(':')) {
				return colon.unmatched({
					reason: 'unexpected-token',
					expects: [{ type: 'const', value: ':' }],
					partName: 'time-zone',
				});
			}
		},
		datetimeTokenCheck.minute,
		datetimeTokenCheck.extra,
	);

	if (!res.matched) {
		log('Failed: %O', res);
	}

	return res;
}
