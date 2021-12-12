import type { Token } from '../../token';
import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { matched, unmatched } from '../../match-result';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#time-zones
 */
export const checkTimeZoneOffsetString: CustomSyntaxChecker = () =>
	function checkTimeZoneOffsetString(value) {
		log('CHECK: time-zone-offset-string');

		return parseTimeZone(value);
	};

export function parseTimeZone(zone: string | Token) {
	const value = typeof zone === 'string' ? zone : zone.value;

	const zoneTokens = TokenCollection.fromPatterns(zone, [
		// Z + -
		/[^0-9]?/,
		// hh
		/[^:]{0,2}/,
		// :
		/[^0-9]?/,
		// mm
		/.[0-9]*/,
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

			if (sign.match('Z')) {
				if (tail.value) {
					return tail[0].unmatched({
						reason: 'extra-token',
					});
				}

				return matched();
			}

			if (!sign.match(['+', '-'])) {
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
		coron => {
			if (!coron || !coron.value) {
				return;
			}

			if (!coron.match(':')) {
				return coron.unmatched({
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
