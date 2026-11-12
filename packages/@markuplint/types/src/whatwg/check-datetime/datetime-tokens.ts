import type { TokenEachCheck } from '../../token/token-collection.js';

import { log } from '../../debug.js';
import { matched, unmatched } from '../../match-result.js';

export const datetimeTokenCheck: Record<
	| 'year'
	| 'month'
	| 'date'
	| 'hour'
	| 'minute'
	| 'second'
	| 'secondFractionalPart'
	| 'week'
	| 'hyphen'
	| 'colon'
	| 'extra'
	| 'colonOrEnd'
	| 'decimalPointOrEnd'
	| 'localDateTimeSeparator'
	| 'normalizedlocalDateTimeSeparator'
	| 'plusOrMinusSign'
	| 'weekSign',
	TokenEachCheck
> &
	Record<'_yearMod400' | '_month', number | null> = {
	/**
	 * Temporary year state, as the remainder of the year divided by 400.
	 *
	 * The Gregorian calendar repeats every 400 years, so the remainder decides
	 * the leap year and the weekday. It is taken from the last four digits
	 * (10000 is a multiple of 400), not from the whole year as a `number`:
	 * the grammar allows any number of digits, and a `number` rounds a year past 2^53.
	 * It stays `null` while the year is invalid.
	 *
	 * Like every temporary state here, it is written to the `TokenCollection` that runs the checks:
	 * `TokenCollection#eachCheck` calls them with `this` bound to the collection, not to this object,
	 * so the state does not carry over from one value to the next.
	 */
	_yearMod400: null,

	/**
	 * Temporary month state
	 */
	_month: null,

	/**
	 * > Four or more ASCII digits, representing year, where year > 0
	 */
	year(year) {
		if (log.enabled) {
			log('Parsing Datetime Year: "%s"', year?.value);
		}

		this._yearMod400 = null;

		if (!year || !year.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'year' }],
				partName: 'year',
			});
		}

		if (!year.matches(/^\d+$/)) {
			return year.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'year',
			});
		}

		if (year.length < 4) {
			return year.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 4 },
				expects: [],
				partName: 'year',
			});
		}

		if (year.toNumber() <= 0) {
			return year.unmatched({
				reason: { type: 'out-of-range', gt: 0 },
				expects: [],
				partName: 'year',
			});
		}

		this._yearMod400 = Number(year.value.slice(-4)) % 400;
	},

	/**
	 * > Two ASCII digits, representing the month month, in the range 1 ≤ month ≤ 12
	 */
	month(month) {
		if (log.enabled) {
			log('Parsing Datetime Month: "%s"', month?.value);
		}

		this._month = null;

		if (!month || !month.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'month' }],
				partName: 'month',
			});
		}

		if (!month.matches(/^\d+$/)) {
			return month.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'month',
			});
		}

		if (month.length !== 2) {
			return month.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'month',
			});
		}

		this._month = month.toNumber();

		if (!(1 <= this._month && this._month <= 12)) {
			return month.unmatched({
				reason: { type: 'out-of-range', gte: 1, lte: 12 },
				expects: [],
				partName: 'month',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing day, in the range 1 ≤ day ≤ maxday where maxday is the number of days in the month month and year year
	 *
	 * or
	 *
	 * In Yearless dates,
	 * > Two ASCII digits, representing day,
	 * > in the range 1 ≤ day ≤ maxday where maxday is the number of days
	 * > in the month month and any arbitrary leap year (e.g. 4 or 2000)
	 * > In other words, if the month is "02", meaning February,
	 * > then the day can be 29, as if the year was a leap year.
	 */
	date(date) {
		if (log.enabled) {
			log('Parsing Datetime Date: "%s"', date?.value);
		}

		if (!date || !date.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'date' }],
				partName: 'date',
			});
		}

		if (!date.matches(/^\d+$/)) {
			return date.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'date',
			});
		}

		if (date.length !== 2) {
			return date.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'date',
			});
		}

		// Without a valid year (a yearless date), take a leap year
		const yearMod400 = this._yearMod400 ?? 0;
		const month = this._month ?? 1;
		const dayOfMonth = (daysOfMonth[month] ?? 0) + (month === 2 && isLeapYear(yearMod400) ? 1 : 0);
		const _date = date.toNumber();

		if (log.enabled) {
			log('Temporary Year mod 400 and Month: %s, %s', this._yearMod400, this._month);
			log('Computed Year mod 400, Month, and Day of Month: %s, %s, %s', yearMod400, month, dayOfMonth);
		}

		if (!(1 <= _date && _date <= dayOfMonth)) {
			return date.unmatched({
				reason: { type: 'out-of-range', gte: 1, lte: dayOfMonth },
				expects: [],
				partName: 'date',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing hour, in the range 0 ≤ hour ≤ 23
	 */
	hour(hour) {
		if (log.enabled) {
			log('Parsing Datetime Hour: "%s"', hour?.value);
		}

		if (!hour || !hour.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'hour' }],
				partName: 'hour',
			});
		}

		if (!hour.matches(/^\d+$/)) {
			return hour.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'hour',
			});
		}

		if (hour.length !== 2) {
			return hour.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'hour',
			});
		}

		const _hour = hour.toNumber();

		if (!(0 <= _hour && _hour <= 23)) {
			return hour.unmatched({
				reason: { type: 'out-of-range', gte: 0, lte: 23 },
				expects: [],
				partName: 'hour',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing minute, in the range 0 ≤ minute ≤ 59
	 */
	minute(minute) {
		if (log.enabled) {
			log('Parsing Datetime Minute: "%s"', minute?.value);
		}

		if (!minute || !minute.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'minute' }],
				partName: 'minute',
			});
		}

		if (!minute.matches(/^\d+$/)) {
			return minute.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'minute',
			});
		}

		if (minute.length !== 2) {
			return minute.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'minute',
			});
		}

		const _minute = minute.toNumber();

		if (!(0 <= _minute && _minute <= 59)) {
			return minute.unmatched({
				reason: { type: 'out-of-range', gte: 0, lte: 59 },
				expects: [],
				partName: 'minute',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing the integer part of second, in the range 0 ≤ s ≤ 59
	 */
	second(second) {
		if (log.enabled) {
			log('Parsing Datetime Second: "%s"', second?.value);
		}

		if (!second || !second.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'second' }],
				partName: 'second',
			});
		}

		if (!second.matches(/^\d+$/)) {
			return second.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'second',
			});
		}

		if (second.length !== 2) {
			return second.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'second',
			});
		}

		const _second = second.toNumber();

		if (!(0 <= _second && _second <= 59)) {
			return second.unmatched({
				reason: { type: 'out-of-range', gte: 0, lte: 59 },
				expects: [],
				partName: 'second',
			});
		}
	},

	/**
	 * > One, two, or three ASCII digits, representing the fractional part of second
	 */
	secondFractionalPart(secondFP) {
		if (log.enabled) {
			log('Parsing Datetime Second Fractional Part: "%s"', secondFP?.value);
		}

		if (!secondFP || !secondFP.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'fractional part' }],
				partName: 'fractional part',
			});
		}

		if (!secondFP.matches(/^\d+$/)) {
			return secondFP.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'fractional part',
			});
		}

		if (!(secondFP.length > 0 && secondFP.length <= 3)) {
			return secondFP.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 1, lte: 3 },
				expects: [],
				partName: 'fractional part',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing the week week, in the range 1 ≤ week ≤ maxweek, where maxweek is the week number of the last day of week-year year
	 */
	week(week) {
		if (log.enabled) {
			log('Parsing Datetime Week: "%s"', week?.value);
		}

		if (!week || !week.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'week' }],
				partName: 'week',
			});
		}

		if (!week.matches(/^\d+$/)) {
			return week.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'week',
			});
		}

		if (week.length !== 2) {
			return week.unmatched({
				reason: { type: 'out-of-range-length-digit', gte: 2, lte: 2 },
				expects: [],
				partName: 'week',
			});
		}

		// An invalid year is reported by its own check, and no week count can be derived from it:
		// the week is then held to the most any week-year has, 53, rather than to that of an arbitrary year.
		const maxweek = this._yearMod400 === null ? 53 : getMaxWeekNum(this._yearMod400);
		const _week = week.toNumber();

		if (!(1 <= _week && _week <= maxweek)) {
			return week.unmatched({
				reason: { type: 'out-of-range', gte: 1, lte: maxweek },
				expects: [],
				partName: 'week',
			});
		}
	},

	/**
	 * > A U+002D HYPHEN-MINUS character (-)
	 */
	hyphen(hyphen) {
		if (log.enabled) {
			log('Parsing Datetime hyphen: "%s"', hyphen?.value);
		}

		if (!hyphen || !hyphen.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'hyphen' }],
				partName: 'datetime',
			});
		}

		if (!hyphen.matches('-')) {
			return hyphen.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'hyphen' }],
				partName: 'datetime',
			});
		}
	},

	/**
	 * > A U+003A COLON character (:)
	 */
	colon(colon) {
		if (log.enabled) {
			log('Parsing Datetime colon: "%s"', colon?.value);
		}

		if (!colon || !colon.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'colon' }],
				partName: 'time',
			});
		}
		if (!colon.matches(':')) {
			return colon.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'colon' }],
				partName: 'time',
			});
		}
	},

	/**
	 * > A U+003A COLON character (:)
	 * or
	 * End of token
	 */
	colonOrEnd(colon) {
		if (!colon || !colon.value) {
			return matched();
		}

		if (!colon.matches(':')) {
			return colon.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'colon' }],
				partName: 'time',
			});
		}
	},

	/**
	 * > A U+002E FULL STOP character (.)
	 * or
	 * End of token
	 */
	decimalPointOrEnd(dot) {
		if (!dot || !dot.value) {
			return matched();
		}
		if (!dot.matches('.')) {
			return dot.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'decimal point' }],
				partName: 'second',
			});
		}
	},

	/**
	 * > A U+0054 LATIN CAPITAL LETTER T character (T) or a U+0020 SPACE character
	 */
	localDateTimeSeparator(sep) {
		if (log.enabled) {
			log('Parsing Datetime Local-Date-Time separator: "%s"', sep?.value);
		}

		if (!sep || !sep.value) {
			return unmatched('', 'missing-token', {
				expects: [
					{ type: 'const', value: 'T' },
					{ type: 'common', value: 'space' },
				],
			});
		}

		if (!sep.matches(['T', ' '])) {
			return sep.unmatched({
				reason: 'unexpected-token',
				expects: [
					{ type: 'const', value: 'T' },
					{ type: 'common', value: 'space' },
				],
			});
		}
	},

	/**
	 * > A U+0054 LATIN CAPITAL LETTER T character (T)
	 */
	normalizedlocalDateTimeSeparator(sep) {
		if (log.enabled) {
			log('Parsing Datetime Normalized-Local-Date-Time separator: %s', sep?.value);
		}

		if (!sep || !sep.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'const', value: 'T' }],
			});
		}

		if (!sep.matches('T')) {
			return sep.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'const', value: 'T' }],
			});
		}
	},

	/**
	 * > Either a U+002B PLUS SIGN character (+) or,
	 * > if the time-zone offset is not zero,
	 * > a U+002D HYPHEN-MINUS character (-),
	 * > representing the sign of the time-zone offset
	 */
	plusOrMinusSign(colon) {
		if (!colon) {
			return unmatched('', 'missing-token', {
				expects: [
					{ type: 'const', value: '+' },
					{ type: 'const', value: '-' },
				],
				partName: 'time-zone',
			});
		}
		if (!colon.matches(['+', '-'])) {
			return colon.unmatched({
				reason: 'unexpected-token',
				expects: [
					{ type: 'const', value: '+' },
					{ type: 'const', value: '-' },
				],
				partName: 'time-zone',
			});
		}
	},

	/**
	 * > A U+0057 LATIN CAPITAL LETTER W character (W)
	 */
	weekSign(weekSign) {
		if (log.enabled) {
			log('Parsing Datetime W sign: "%s"', weekSign?.value);
		}

		if (!weekSign || !weekSign.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'const', value: 'W' }],
				partName: 'week',
			});
		}

		if (!weekSign.matches('W')) {
			return weekSign.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'const', value: 'W' }],
				partName: 'week',
			});
		}
	},

	extra(extra) {
		if (log.enabled) {
			log('Parsing Datetime EXTRA STRING: "%s"', extra?.value);
		}

		if (extra && extra.value) {
			return extra.unmatched({
				reason: 'extra-token',
			});
		}
	},
};

const daysOfMonth = [
	0,
	// 1
	31,
	// 2
	28,
	// 3
	31,
	// 4
	30,
	// 5
	31,
	// 6
	30,
	// 7
	31,
	// 8
	31,
	// 9
	30,
	// 10
	31,
	// 11
	30,
	// 12
	31,
] as const;

/**
 * Returns the number of weeks of the week-year `year`.
 *
 * > A week-year with a number year has 53 weeks if it corresponds to either
 * > a year year in the proleptic Gregorian calendar that has a Thursday as its first day (January 1st),
 * > or a year year in the proleptic Gregorian calendar that has a Wednesday as its first day (January 1st)
 * > and where year is a number divisible by 400, or a number divisible by 4 but not by 100.
 * > All other week-years have 52 weeks.
 *
 * The weekday is computed arithmetically rather than with `Date`:
 * a `Date` read in local time shifts the day by the time zone of the machine,
 * `Date.UTC` maps the years 0–99 to 1900–1999,
 * and years after 275760 are outside the range of `Date`.
 *
 * Only `year` mod 400 matters, since the Gregorian calendar repeats every 400 years.
 * Any integer is accepted (0 and below too); for a year that a `number` cannot hold exactly,
 * pass year mod 400 instead.
 *
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#weeks
 */
export function getMaxWeekNum(year: number) {
	const firstDay = getWeekdayOfJanuaryFirst(year);
	const THURSDAY = 4;
	const WEDNESDAY = 3;
	return firstDay === THURSDAY || (firstDay === WEDNESDAY && isLeapYear(year)) ? 53 : 52;
}

function isLeapYear(year: number) {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Gauss's algorithm for the weekday of January 1st in the proleptic Gregorian calendar
 * (0 = Sunday … 6 = Saturday).
 */
function getWeekdayOfJanuaryFirst(year: number) {
	const y = year - 1;
	return mod(1 + 5 * mod(y, 4) + 4 * mod(y, 100) + 6 * mod(y, 400), 7);
}

/**
 * The remainder with the sign of the divisor, so that the year 0 and below stay in 0…m-1.
 */
function mod(n: number, m: number) {
	return ((n % m) + m) % m;
}
