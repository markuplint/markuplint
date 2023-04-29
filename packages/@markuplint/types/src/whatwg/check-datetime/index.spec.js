// @ts-nocheck

import { checkDateString } from './date-string';
import { getMaxWeekNum } from './datetime-tokens';
import { checkDurationISO8601LikeString, checkDurationComponentListString } from './duration-string';
import { checkGlobalDateAndTimeString } from './global-date-and-time-string';
import { checkLocalDateAndTimeString, checkNormalizedLocalDateAndTimeString } from './local-date-and-time-string';
import { checkMonthString } from './month-string';
import { checkTimeString } from './time-string';
import { checkTimeZoneOffsetString } from './time-zone-offset-string';
import { checkWeekString } from './week-string';
import { checkYearString } from './year-string';
import { checkYearlessDateString } from './yearless-date-string';

import { checkDateTime } from '.';

const isMonth = checkMonthString();
const isDate = checkDateString();
const isYearlessDate = checkYearlessDateString();
const isTimeString = checkTimeString();
const isLocalDateAndTime = checkLocalDateAndTimeString();
const isNormalizedLocalDateAndTime = checkNormalizedLocalDateAndTimeString();
const isTimeZoneOffset = checkTimeZoneOffsetString();
const isGlobalDateAndTime = checkGlobalDateAndTimeString();
const isWeek = checkWeekString();
const isYear = checkYearString();
const isDurationISO8601Like = checkDurationISO8601LikeString();
const isDurationComponentList = checkDurationComponentListString();
const isDateTime = checkDateTime();

test('max-week', () => {
	expect(getMaxWeekNum(1976)).toBe(53);
	expect(getMaxWeekNum(1977)).toBe(52);
	expect(getMaxWeekNum(1978)).toBe(52);
	expect(getMaxWeekNum(1979)).toBe(52);
	expect(getMaxWeekNum(1981)).toBe(53);
});

test('month-string', () => {
	expect(isMonth('').reason).toBe('empty-token');
	expect(isMonth(' ').reason).toBe('unexpected-token');
	expect(isMonth('a').reason).toBe('unexpected-token');
	expect(isMonth('0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 4 });
	expect(isMonth('0000').reason).toStrictEqual({ type: 'out-of-range', gt: 0 });
	expect(isMonth('0001').reason).toBe('missing-token');
	expect(isMonth('0001:').reason).toBe('unexpected-token');
	expect(isMonth('0001-').reason).toBe('missing-token');
	expect(isMonth('0001-a').reason).toBe('unexpected-token');
	expect(isMonth('0001-0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isMonth('0001-001').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isMonth('0001-00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 12 });
	expect(isMonth('0001-13').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 12 });
	expect(isMonth('0001-01').matched).toBe(true);
	expect(isMonth('0001-12').matched).toBe(true);
	expect(isMonth('10001-01').matched).toBe(true);
	expect(isMonth('0001-01-').reason).toBe('extra-token');
});

test('date-string', () => {
	expect(isDate('').reason).toBe('empty-token');
	expect(isDate(' ').reason).toBe('unexpected-token');
	expect(isDate('a').reason).toBe('unexpected-token');
	expect(isDate('0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 4 });
	expect(isDate('0000').reason).toStrictEqual({ type: 'out-of-range', gt: 0 });
	expect(isDate('2000').reason).toBe('missing-token');
	expect(isDate('2000:').reason).toBe('unexpected-token');
	expect(isDate('2000-').reason).toBe('missing-token');
	expect(isDate('2000-a').reason).toBe('unexpected-token');
	expect(isDate('2000-0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isDate('2000-00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 12 });
	expect(isDate('2000-01').reason).toBe('missing-token');
	expect(isDate('2000-01:').reason).toBe('unexpected-token');
	expect(isDate('2000-01-').reason).toBe('missing-token');
	expect(isDate('2000-01-a').reason).toBe('unexpected-token');
	expect(isDate('2000-01-0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isDate('2000-01-001').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isDate('2000-01-00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 31 });
	expect(isDate('2000-01-01').matched).toBe(true);
	expect(isDate('2000-01-31').matched).toBe(true);
	expect(isDate('2000-01-32').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 31 });
	expect(isDate('2000-02-28').matched).toBe(true);
	expect(isDate('2000-02-29').matched).toBe(true);
	expect(isDate('2000-02-30').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 29 });
	expect(isDate('2001-02-28').matched).toBe(true);
	expect(isDate('2001-02-29').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 28 });
});

test('yearless-date-string', () => {
	expect(isYearlessDate('').reason).toBe('empty-token');
	expect(isYearlessDate(' ').reason).toBe('unexpected-token');
	expect(isYearlessDate('a').reason).toBe('unexpected-token');
	expect(isYearlessDate('0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isYearlessDate('00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 12 });
	expect(isYearlessDate('01').reason).toBe('missing-token');
	expect(isYearlessDate('01:').reason).toBe('unexpected-token');
	expect(isYearlessDate('01-').reason).toBe('missing-token');
	expect(isYearlessDate('01-a').reason).toBe('unexpected-token');
	expect(isYearlessDate('01-0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isYearlessDate('01-00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 31 });
	expect(isYearlessDate('01-01').matched).toBe(true);
	expect(isYearlessDate('01-31').matched).toBe(true);
	expect(isYearlessDate('01-32').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 31 });
	expect(isYearlessDate('02-28').matched).toBe(true);
	expect(isYearlessDate('02-29').matched).toBe(true);
	expect(isYearlessDate('02-30').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 29 });
});

test('time-string', () => {
	expect(isTimeString('').reason).toBe('empty-token');
	expect(isTimeString(' ').reason).toBe('unexpected-token');
	expect(isTimeString('a').reason).toBe('unexpected-token');
	expect(isTimeString('0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('000').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('24').reason).toStrictEqual({ type: 'out-of-range', gte: 0, lte: 23 });
	expect(isTimeString('00').reason).toBe('missing-token');
	expect(isTimeString('00-').reason).toBe('unexpected-token');
	expect(isTimeString('00:').reason).toBe('missing-token');
	expect(isTimeString('00:a').reason).toBe('unexpected-token');
	expect(isTimeString('00:0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('00:000').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('00:00').matched).toBe(true);
	expect(isTimeString('00:59').matched).toBe(true);
	expect(isTimeString('00:60').reason).toStrictEqual({ type: 'out-of-range', gte: 0, lte: 59 });
	expect(isTimeString('00:00-').reason).toBe('unexpected-token');
	expect(isTimeString('00:00:').reason).toBe('missing-token');
	expect(isTimeString('00:00:a').reason).toBe('unexpected-token');
	expect(isTimeString('00:00:0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('00:00:000').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isTimeString('00:00:00').matched).toBe(true);
	expect(isTimeString('00:00:59').matched).toBe(true);
	expect(isTimeString('00:00:60').reason).toStrictEqual({ type: 'out-of-range', gte: 0, lte: 59 });
	expect(isTimeString('00:00:00:').reason).toBe('unexpected-token');
	expect(isTimeString('00:00:00.').reason).toBe('missing-token');
	expect(isTimeString('00:00:00.a').reason).toBe('unexpected-token');
	expect(isTimeString('00:00:00.0').matched).toBe(true);
	expect(isTimeString('00:00:00.9').matched).toBe(true);
	expect(isTimeString('00:00:00.00').matched).toBe(true);
	expect(isTimeString('00:00:00.99').matched).toBe(true);
	expect(isTimeString('00:00:00.000').matched).toBe(true);
	expect(isTimeString('00:00:00.999').matched).toBe(true);
	expect(isTimeString('00:00:00.0000').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 1, lte: 3 });
	expect(isTimeString('00:00:00.1000').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 1, lte: 3 });
});

test('local-date-and-time-string', () => {
	expect(isLocalDateAndTime('').reason).toBe('empty-token');
	expect(isLocalDateAndTime(' ').reason).toBe('unexpected-token');
	expect(isLocalDateAndTime('2020-12-31').reason).toBe('missing-token');
	expect(isLocalDateAndTime('2020-12-31:').reason).toBe('unexpected-token');
	expect(isLocalDateAndTime('2020-12-31T').reason).toBe('missing-token');
	expect(isLocalDateAndTime('2020-12-31 ').reason).toBe('missing-token');
	expect(isLocalDateAndTime('2020-12-31  ').reason).toBe('unexpected-token');
	expect(isLocalDateAndTime('2020-12-31T00:00:00.000').matched).toBe(true);
});

test('normalized-local-date-and-time-string', () => {
	expect(isNormalizedLocalDateAndTime('').reason).toBe('empty-token');
	expect(isNormalizedLocalDateAndTime(' ').reason).toBe('unexpected-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31').reason).toBe('missing-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31:').reason).toBe('unexpected-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T').reason).toBe('missing-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31 ').reason).toBe('unexpected-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00').matched).toBe(true);
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:00').reason).toBe('extra-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:01').matched).toBe(true);
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:00.0').reason).toBe('extra-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:00.00').reason).toBe('extra-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:00.000').reason).toBe('extra-token');
	expect(isNormalizedLocalDateAndTime('2020-12-31T00:00:00.001').matched).toBe(true);
});

test('time-zone-offset', () => {
	expect(isTimeZoneOffset('').reason).toBe('empty-token');
	expect(isTimeZoneOffset(' ').reason).toBe('unexpected-token');
	expect(isTimeZoneOffset('a').reason).toBe('unexpected-token');
	expect(isTimeZoneOffset('z').reason).toBe('unexpected-token');
	expect(isTimeZoneOffset('Z').matched).toBe(true);
	expect(isTimeZoneOffset('Z:').reason).toBe('extra-token');
	expect(isTimeZoneOffset('ZZ').reason).toBe('extra-token');
	expect(isTimeZoneOffset('+').reason).toBe('missing-token');
	expect(isTimeZoneOffset('-').reason).toBe('missing-token');
	expect(isTimeZoneOffset('+-').reason).toBe('unexpected-token');
	expect(isTimeZoneOffset('+00').reason).toBe('missing-token');
	expect(isTimeZoneOffset('+00:').reason).toBe('missing-token');
	expect(isTimeZoneOffset('+00:00').matched).toBe(true);
	expect(isTimeZoneOffset('+24:00').matched).toBe(false);
	expect(isTimeZoneOffset('+00:60').matched).toBe(false);
	expect(isTimeZoneOffset('+000:00').matched).toBe(false);
	expect(isTimeZoneOffset('+00:000').matched).toBe(false);
	expect(isTimeZoneOffset('+00:00:').reason).toBe('extra-token');
	expect(isTimeZoneOffset('+0000').matched).toBe(true);
	expect(isTimeZoneOffset('+2400').matched).toBe(false);
	expect(isTimeZoneOffset('+0060').matched).toBe(false);
	expect(isTimeZoneOffset('+00000').matched).toBe(false);
	expect(isTimeZoneOffset('+0000:').reason).toBe('extra-token');
});

test('global-date-and-time-string', () => {
	expect(isGlobalDateAndTime('2000-01-01').reason).toBe('missing-token');
	expect(isGlobalDateAndTime('2000-01-01T00:00').reason).toBe('missing-token');
	expect(isGlobalDateAndTime('2000-01-01T00:00').reason).toBe('missing-token');
	expect(isGlobalDateAndTime('2000-01-01T00:00+').reason).toBe('missing-token');
	expect(isGlobalDateAndTime('2000-01-01T00:00Z').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00+00').reason).toBe('missing-token');
	expect(isGlobalDateAndTime('2000-01-01T00:00+0000').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00+00:00').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00-2359').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00-23:59').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00:00+0000').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00:00.000+0000').matched).toBe(true);
	expect(isGlobalDateAndTime('2000-01-01T00:00:00.000+0000a').reason).toBe('extra-token');
});

test('week-string', () => {
	expect(isWeek('').reason).toBe('empty-token');
	expect(isWeek(' ').reason).toBe('unexpected-token');
	expect(isWeek('a').reason).toBe('unexpected-token');
	expect(isWeek('2000').reason).toBe('missing-token');
	expect(isWeek('2000-').reason).toBe('missing-token');
	expect(isWeek('2000-a').reason).toBe('unexpected-token');
	expect(isWeek('2000-W').reason).toBe('missing-token');
	expect(isWeek('2000-Wa').reason).toBe('unexpected-token');
	expect(isWeek('2000-W0').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 2, lte: 2 });
	expect(isWeek('2000-W00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 52 });
	expect(isWeek('2000-W53').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 52 });
	expect(isWeek('2000-W01').matched).toBe(true);
	expect(isWeek('2000-W52').matched).toBe(true);
	expect(isWeek('2004-W00').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 53 });
	expect(isWeek('2004-W54').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 53 });
	expect(isWeek('2004-W01').matched).toBe(true);
	expect(isWeek('2004-W53').matched).toBe(true);
	expect(isWeek('2000-W01a').reason).toBe('extra-token');
});

test('year-string', () => {
	expect(isYear('').reason).toBe('empty-token');
	expect(isYear(' ').reason).toBe('unexpected-token');
	expect(isYear('a').reason).toBe('unexpected-token');
	expect(isYear('200').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 4 });
	expect(isYear('2000').matched).toBe(true);
	expect(isYear('20000').matched).toBe(true);
});

test('duration-string (IS08601 like)', () => {
	expect(isDurationISO8601Like('').reason).toBe('empty-token');
	expect(isDurationISO8601Like(' ').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('a').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0D').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0H').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P0Dt').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P0DT').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H0M').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0M0').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H0M0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0M0.').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H0M0M').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P0DT0H0M0.0').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H0M0.0M').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P0DT0H0M0.000').reason).toBe('missing-token');
	expect(isDurationISO8601Like('P0DT0H0M0.0000').reason).toStrictEqual({
		gte: 1,
		lte: 3,
		type: 'out-of-range-length-digit',
	});
	expect(isDurationISO8601Like('P0DT0H0M0.000S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0M0.000S0').reason).toBe('extra-token');
	expect(isDurationISO8601Like('P0DT0H0M0.000S0H').reason).toBe('extra-token');
	expect(isDurationISO8601Like('P0DT0M').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0.0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0M0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0H0.0S').matched).toBe(true);
	expect(isDurationISO8601Like('P0DT0M0H').reason).toBe('unexpected-token');
	expect(isDurationISO8601Like('P0DT0S0M').reason).toBe('extra-token');
	expect(isDurationISO8601Like('P0DT0.0S0M').reason).toBe('extra-token');
	expect(isDurationISO8601Like('PT4H18M3S').matched).toBe(true);
});

test('duration-string (duration component list)', () => {
	expect(isDurationComponentList('').reason).toBe('empty-token');
	expect(isDurationComponentList(' ').reason).toBe('missing-token');
	expect(isDurationComponentList(' a').reason).toBe('unexpected-token');
	expect(isDurationComponentList(' 0').reason).toBe('missing-token');
	expect(isDurationComponentList(' 0a').reason).toBe('unexpected-token');
	expect(isDurationComponentList(' 0w').matched).toBe(true);
	expect(isDurationComponentList(' 0ww').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0w').matched).toBe(true);
	expect(isDurationComponentList('0w ').matched).toBe(true);
	expect(isDurationComponentList('0w 0').reason).toBe('missing-token');
	expect(isDurationComponentList('0w 0w').reason).toBe('duplicated');
	expect(isDurationComponentList('0w 0d').matched).toBe(true);
	expect(isDurationComponentList('0w  0d').matched).toBe(true);
	expect(isDurationComponentList(' 0w  0d').matched).toBe(true);
	expect(isDurationComponentList(' 0w  0d ').matched).toBe(true);
	expect(isDurationComponentList('0w  0d  ').matched).toBe(true);
	expect(isDurationComponentList('\n0w\n0d\n').matched).toBe(true);
	expect(isDurationComponentList('0w 0.').reason).toBe('missing-token');
	expect(isDurationComponentList('0w 0.0').reason).toBe('missing-token');
	expect(isDurationComponentList('0w 0.0s').matched).toBe(true);
	expect(isDurationComponentList('0w 0.0d').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0s 0.').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0s 0.0').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0s 0.0s').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0w 0.00s').matched).toBe(true);
	expect(isDurationComponentList('0w 0.000s').matched).toBe(true);
	expect(isDurationComponentList('0w 0.0000s').reason).toStrictEqual({
		gte: 1,
		lte: 3,
		type: 'out-of-range-length-digit',
	});
	expect(isDurationComponentList('0s 0.000s').reason).toBe('unexpected-token');
	expect(isDurationComponentList('0.000s 0s').reason).toBe('duplicated');
	expect(isDurationComponentList('0w0d0h0m0.000s').matched).toBe(true);
	expect(isDurationComponentList('0w 0d 0h 0m 0.000s').matched).toBe(true);
	expect(isDurationComponentList('0w 0d0h 0m0.000s').matched).toBe(true);
	expect(isDurationComponentList(' 2w 3d6m 3.4s 93xxxxxxx').reason).toBe('unexpected-token');
});

test('date-time', () => {
	expect(isDateTime('200-1-1').reason).toStrictEqual({ type: 'out-of-range-length-digit', gte: 4 });
	expect(isDateTime('2001-02-29').reason).toStrictEqual({ type: 'out-of-range', gte: 1, lte: 28 });
	expect(isDateTime('2001-02-28T').reason).toBe('missing-token');
	expect(isDateTime('2001-02-28T00').reason).toBe('missing-token');
	expect(isDateTime('2001-02-28T00:0').reason).toStrictEqual({ gte: 2, lte: 2, type: 'out-of-range-length-digit' });
	expect(isDateTime('2000-01-01T00:00:00.000+0000a').reason).toBe('extra-token');
	expect(isDateTime('P0DT0M0H').reason).toBe('unexpected-token');
});
