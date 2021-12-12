import type { CustomSyntaxChecker } from '../../types';

import { log } from '../../debug';
import { matched, unmatched } from '../../match-result';
import { TokenCollection } from '../../token';

import { datetimeTokenCheck } from './datetime-tokens';

/**
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#durations
 */
export const checkDurationISO8601LikeString: CustomSyntaxChecker = () =>
	function checkDurationISO8601LikeString(value) {
		log('CHECK: duration-string (ISO8601 like)');

		// PnDTnHnMnS
		const tokens = TokenCollection.fromPatterns(value, [
			// Start sign P
			/[^0-9T]?/,
			// date part
			/[^T]*/,
			// Time sign T
			/[^0-9]?/,
			// Time part
			/.*/,
		]);

		log('Duration ISO8601: "%s" => %O', tokens.value, tokens);

		const res = tokens.eachCheck(
			p => {
				if (!p || !p.value) {
					return unmatched('', 'missing-token', {
						expects: [{ type: 'const', value: 'P' }],
						partName: 'duration',
					});
				}

				if (!p.match('P', false)) {
					return p.unmatched({
						reason: 'unexpected-token',
						expects: [{ type: 'const', value: 'P' }],
						partName: 'duration',
					});
				}
			},
			d => {
				if (!d || !d.value) {
					return;
				}

				const [num, sign, extra] = TokenCollection.fromPatterns(d, [/[0-9]+/, /./]);

				log('Date part: "%s" => %O', d.value, { num, sign });

				if (!num.match(/^[0-9]+$/)) {
					return num.unmatched({
						reason: 'unexpected-token',
						expects: [],
						partName: 'date',
					});
				}

				if (!sign || !sign.value) {
					return unmatched('', 'missing-token', {
						expects: [{ type: 'const', value: 'D' }],
						partName: 'date',
					});
				}

				if (!sign.match('D', false)) {
					return sign.unmatched({
						reason: 'unexpected-token',
						expects: [{ type: 'const', value: 'D' }],
						partName: 'date',
					});
				}

				if (extra && extra.value) {
					return extra.unmatched({
						reason: 'unexpected-token',
						expects: [{ type: 'const', value: 'T' }],
					});
				}
			},
			t => {
				if (!t || !t.value) {
					return unmatched('', 'missing-token', {
						expects: [{ type: 'const', value: 'T' }],
					});
				}

				if (!t.match('T', false)) {
					return t.unmatched({
						reason: 'unexpected-token',
						expects: [{ type: 'const', value: 'T' }],
					});
				}
			},
			time => {
				if (!time) {
					return unmatched('', 'missing-token', {
						expects: [
							{ type: 'common', value: 'hour' },
							{ type: 'common', value: 'minute' },
							{ type: 'common', value: 'second' },
						],
						partName: 'time',
					});
				}

				const timeTokens = TokenCollection.fromPatterns(time, [
					// Hour part
					/[0-9]+(\.[0-9]*)?[^0-9]?/,
					// Minute part
					/[0-9]+(\.[0-9]*)?[^0-9]?/,
					// Second part
					/[0-9]+(\.[0-9]*)?[^0-9]?/,
				]);

				log('Time part: "%s" => %O', timeTokens.value, timeTokens);

				const [h, m, s] = timeTokens;

				if ((h?.value || '') + (m?.value || '') + (s?.value || '') === '') {
					return unmatched('', 'missing-token', {
						expects: [
							{ type: 'common', value: 'hour' },
							{ type: 'common', value: 'minute' },
							{ type: 'common', value: 'second' },
						],
					});
				}

				const specified = new Set<'H' | 'M' | 'S'>();

				for (const t of timeTokens) {
					if (!t || !t.value) {
						continue;
					}

					if (specified.has('S')) {
						return t.unmatched({
							reason: 'extra-token',
						});
					}

					const [num, dpfp, sign] = TokenCollection.fromPatterns(t, [/[0-9]+/, /(\.[0-9]*)?/, /[^0-9]+/]);

					log('Time part (h|m|s): "%s" => %O', t.value, { num, dpfp, sign });

					if (!num.match(/^[0-9]+$/)) {
						return num.unmatched({
							reason: 'unexpected-token',
							expects: [{ type: 'common', value: 'number' }],
							partName: 'time',
						});
					}

					if (dpfp && dpfp.value) {
						const [dp, fp] = TokenCollection.fromPatterns(dpfp, [/\./, /[0-9]+/]);

						log('Second fractional part (h|m|s): "%s" => %O', dpfp.value, { dp, fp });

						if (!dp.match('.')) {
							return dp.unmatched({
								reason: 'unexpected-token',
								expects: [],
								partName: 'decimal point',
							});
						}

						if (!fp || !fp.value) {
							return unmatched('', 'missing-token', {
								expects: [{ type: 'common', value: 'fractional part' }],
								partName: 'second',
							});
						}

						if (!fp.match(/^[0-9]+$/)) {
							return fp.unmatched({
								reason: 'unexpected-token',
								expects: [],
								partName: 'fractional part',
							});
						}

						if (!(1 <= fp.length && fp.length <= 3)) {
							return fp.unmatched({
								reason: { type: 'out-of-range-length-digit', gte: 1, lte: 3 },
								expects: [],
								partName: 'fractional part',
							});
						}
					}

					const expects = [
						{ type: 'const', value: 'H' },
						{ type: 'const', value: 'M' },
						{ type: 'const', value: 'S' },
					] as const;

					if (!sign || !sign.value) {
						return unmatched('', 'missing-token', {
							expects: expects.filter(e => !specified.has(e.value)),
							partName: 'time',
						});
					}

					if (specified.has('M') && sign.match('H', false)) {
						return sign.unmatched({
							reason: 'unexpected-token',
							expects: [{ type: 'const', value: 'S' }],
							partName: 'time',
						});
					}

					if (
						!sign.match(['H', 'M', 'S'], false) ||
						(sign.match('H', false) && specified.has('H')) ||
						(sign.match('M', false) && specified.has('M'))
					) {
						return sign.unmatched({
							reason: 'unexpected-token',
							expects: expects.filter(e => !specified.has(e.value)),
							partName: 'time',
						});
					}

					specified.add(sign.value as 'H' | 'M' | 'S');
				}
			},
			datetimeTokenCheck.extra,
		);

		if (!res.matched) {
			log('Failed: %O', res);
		}

		return res;
	};

export const checkDurationComponentListString: CustomSyntaxChecker = () =>
	function checkDurationComponentListString(value) {
		log('CHECK: duration-string (duration component list)');

		if (!value) {
			return unmatched('', 'empty-token', {
				expects: [{ type: 'common', value: 'time' }],
			});
		}

		const patterns = [
			// 1. Zero or more ASCII whitespace.
			/\s*/,
			// 2. One or more ASCII digits, representing a number of time units,
			// scaled by the duration time component scale specified (see below)
			// to represent a number of seconds.
			/[0-9]+/,
			// 3. If the duration time component scale specified is 1 (i.e. the units are seconds),
			// then, optionally, a U+002E FULL STOP character (.) followed by
			// one, two, or three ASCII digits, representing a fraction of a second.
			/(\.[0-9]*)?/,
			// 4. Zero or more ASCII whitespace.
			/\s*/,
			// 5. One of the following characters, representing the duration time component scale
			// of the time unit used in the numeric part of the duration time component:
			/[^0-9]/,
			// 6. Zero or more ASCII whitespace.
			/\s*/,
		];

		const tokens = TokenCollection.fromPatterns(value, patterns, { repeat: true });
		const components = tokens.chunk(patterns.length);

		const specified = new Set<'w' | 'd' | 'h' | 'm' | 's'>();

		for (const component of components) {
			log('Duration Component: "%s" => %O', component.value, component);

			const [, , dpfp, , unit] = component;

			const res = component.eachCheck(
				ws => {},
				num => {
					if (!num || !num.value) {
						const reason = dpfp?.value || unit?.value ? 'unexpected-token' : 'missing-token';
						return unmatched('', reason, {
							expects: [{ type: 'common', value: 'time' }],
						});
					}
				},
				dpfp => {
					if (!dpfp || !dpfp.value) {
						return;
					}

					const unitExpects = (
						[
							{ type: 'const', value: 'w' },
							{ type: 'const', value: 'd' },
							{ type: 'const', value: 'h' },
							{ type: 'const', value: 'm' },
							{ type: 'const', value: 's' },
						] as const
					).filter(e => !specified.has(e.value));

					if (specified.has('s')) {
						return dpfp.unmatched({
							reason: 'unexpected-token',
							expects: unitExpects,
							partName: 'unit',
						});
					}

					const [, fp] = TokenCollection.fromPatterns(dpfp, [/\./, /[0-9]+/]);

					if (!fp || !fp.value) {
						return unmatched('', 'missing-token', {
							expects: [{ type: 'common', value: 'fractional part' }],
							partName: 'fractional part',
						});
					}

					if (!fp.match(/[0-9]+/)) {
						return fp.unmatched({
							reason: 'unexpected-token',
							expects: [{ type: 'common', value: 'fractional part' }],
							partName: 'fractional part',
						});
					}

					if (!(1 <= fp.length && fp.length <= 3)) {
						return fp.unmatched({
							reason: { type: 'out-of-range-length-digit', gte: 1, lte: 3 },
							expects: [],
							partName: 'fractional part',
						});
					}
				},
				ws => {},
				unit => {
					const expects = (
						[
							{ type: 'const', value: 'w' },
							{ type: 'const', value: 'd' },
							{ type: 'const', value: 'h' },
							{ type: 'const', value: 'm' },
							{ type: 'const', value: 's' },
						] as const
					).filter(e => !specified.has(e.value));

					if (!unit || !unit.value) {
						return unmatched('', 'missing-token', {
							expects,
							partName: 'unit',
						});
					}

					const unitVal = unit.value.toLowerCase() as 'w' | 'd' | 'h' | 'm' | 's';

					if (specified.has(unitVal)) {
						return unit.unmatched({
							reason: 'duplicated',
							expects,
							partName: 'unit',
						});
					}

					if (dpfp && dpfp.value && unit.match(['w', 'd', 'h', 'm'])) {
						return unit.unmatched({
							reason: 'unexpected-token',
							expects: [{ type: 'const', value: 's' }],
							partName: 'unit',
						});
					}

					if (!unit.match(['w', 'd', 'h', 'm', 's'])) {
						return unit.unmatched({
							reason: 'unexpected-token',
							expects,
							partName: 'unit',
						});
					}

					specified.add(unitVal);
				},
				ws => {},
			);

			if (!res.matched) {
				log('Failed: %O', res);

				return res;
			}
		}

		return matched();
	};
