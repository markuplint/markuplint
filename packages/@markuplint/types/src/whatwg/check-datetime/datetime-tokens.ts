import type { TokenEachCheck } from '../../token/token-collection';

import { log } from '../../debug';
import { matched, unmatched } from '../../match-result';

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
	| 'coron'
	| 'extra'
	| 'coronOrEnd'
	| 'decimalPointOrEnd'
	| 'localDateTimeSeparator'
	| 'normalizedlocalDateTimeSeparator'
	| 'plusOrMinusSign'
	| 'weekSign',
	TokenEachCheck
> &
	Record<'_year' | '_month', number | null> = {
	/**
	 * Temporary year state
	 */
	_year: null,

	/**
	 * Temporary month state
	 */
	_month: null,

	/**
	 * > Four or more ASCII digits, representing year, where year > 0
	 */
	year(year) {
		log('Parsing Datetime Year: "%s"', year?.value);

		this._year = null;

		if (!year || !year.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'year' }],
				partName: 'year',
			});
		}

		if (!year.match(/^[0-9]+$/)) {
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

		this._year = year.toNumber();

		if (this._year <= 0) {
			return year.unmatched({
				reason: { type: 'out-of-range', gt: 0 },
				expects: [],
				partName: 'year',
			});
		}
	},

	/**
	 * > Two ASCII digits, representing the month month, in the range 1 ≤ month ≤ 12
	 */
	month(month) {
		log('Parsing Datetime Month: "%s"', month?.value);

		this._month = null;

		if (!month || !month.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'month' }],
				partName: 'month',
			});
		}

		if (!month.match(/^[0-9]+$/)) {
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
		log('Parsing Datetime Date: "%s"', date?.value);

		if (!date || !date.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'date' }],
				partName: 'date',
			});
		}

		if (!date.match(/^[0-9]+$/)) {
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

		// Set the leap year if _year is null
		const year = this._year || 2000;
		const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
		const month = this._month || 1;
		const dayOfMonth = daysOfMonth[month] + (month === 2 && isLeap ? 1 : 0);
		const _date = date.toNumber();

		log('Temporary Year and Month: %s, %s', this._year, this._month);
		log('Computed Year, Month, and Day of Month: %s, %s, %s', year, month, dayOfMonth);

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
		log('Parsing Datetime Hour: "%s"', hour?.value);

		if (!hour || !hour.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'hour' }],
				partName: 'hour',
			});
		}

		if (!hour.match(/^[0-9]+$/)) {
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
		log('Parsing Datetime Minute: "%s"', minute?.value);

		if (!minute || !minute.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'minute' }],
				partName: 'minute',
			});
		}

		if (!minute.match(/^[0-9]+$/)) {
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
		log('Parsing Datetime Second: "%s"', second?.value);

		if (!second || !second.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'second' }],
				partName: 'second',
			});
		}

		if (!second.match(/^[0-9]+$/)) {
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
		log('Parsing Datetime Second Fractional Part: "%s"', secondFP?.value);

		if (!secondFP || !secondFP.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'fractional part' }],
				partName: 'fractional part',
			});
		}

		if (!secondFP.match(/^[0-9]+$/)) {
			return secondFP.unmatched({
				reason: 'unexpected-token',
				expects: [],
				partName: 'fractional part',
			});
		}

		if (!(1 <= secondFP.length && secondFP.length <= 3)) {
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
		log('Parsing Datetime Week: "%s"', week?.value);

		if (!week || !week.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'week' }],
				partName: 'week',
			});
		}

		if (!week.match(/^[0-9]+$/)) {
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

		const maxweek = getMaxWeekNum(this._year || 0);
		const _week = week.toNumber();

		if (!(1 <= _week && _week <= maxweek)) {
			return week.unmatched({
				reason: { type: 'out-of-range', gte: 1, lte: maxweek },
				expects: [],
				partName: 'date',
			});
		}
	},

	/**
	 * > A U+002D HYPHEN-MINUS character (-)
	 */
	hyphen(hyphen) {
		log('Parsing Datetime hyphen: "%s"', hyphen?.value);

		if (!hyphen || !hyphen.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'hyphen' }],
				partName: 'datetime',
			});
		}

		if (!hyphen.match('-')) {
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
	coron(coron) {
		log('Parsing Datetime coron: "%s"', coron?.value);

		if (!coron || !coron.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'common', value: 'coron' }],
				partName: 'time',
			});
		}
		if (!coron.match(':')) {
			return coron.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'coron' }],
				partName: 'time',
			});
		}
	},

	/**
	 * > A U+003A COLON character (:)
	 * or
	 * End of token
	 */
	coronOrEnd(coron) {
		if (!coron || !coron.value) {
			return matched();
		}

		if (!coron.match(':')) {
			return coron.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'coron' }],
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
		if (!dot.match('.')) {
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
		log('Parsing Datetime Local-Date-Time separator: "%s"', sep?.value);

		if (!sep || !sep.value) {
			return unmatched('', 'missing-token', {
				expects: [
					{ type: 'const', value: 'T' },
					{ type: 'common', value: 'space' },
				],
			});
		}

		if (!sep.match(['T', ' '])) {
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
		log('Parsing Datetime Normalized-Local-Date-Time separator: %s', sep?.value);

		if (!sep || !sep.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'const', value: 'T' }],
			});
		}

		if (!sep.match('T')) {
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
	plusOrMinusSign(coron) {
		if (!coron) {
			return unmatched('', 'missing-token', {
				expects: [
					{ type: 'const', value: '+' },
					{ type: 'const', value: '-' },
				],
				partName: 'time-zone',
			});
		}
		if (!coron.match(['+', '-'])) {
			return coron.unmatched({
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
		log('Parsing Datetime W sign: "%s"', weekSign?.value);

		if (!weekSign || !weekSign.value) {
			return unmatched('', 'missing-token', {
				expects: [{ type: 'const', value: 'W' }],
				partName: 'time-zone',
			});
		}

		if (!weekSign.match('W')) {
			return weekSign.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'const', value: 'W' }],
				partName: 'time-zone',
			});
		}
	},

	/**
	 * Extra token
	 */
	extra(extra) {
		log('Parsing Datetime EXTRA STRING: "%s"', extra?.value);

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
];

export function getMaxWeekNum(year: number) {
	let date = 31;
	while (date) {
		const d = new Date(Date.UTC(year, 11, date, 0, 0, 0, 0));
		d.setDate(d.getDate() + 4 - (d.getDay() || 7));
		const yearStart = new Date(d.getFullYear(), 0, 1);
		const weekNo = Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
		if (weekNo !== 1) {
			return weekNo;
		}
		date--;
	}
	return NaN;
}
