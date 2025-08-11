import { test, expect } from 'vitest';

import { parseADatetime, getCandidateDatetimeString } from './utils.js';

test('parseADatetime', () => {
	expect(parseADatetime('2000/1/1', ['en'])).toStrictEqual({
		datetime: {
			year: 2000,
			month: 1,
			day: 1,
		},
	});
	expect(parseADatetime('3:00PM', ['en'])).toStrictEqual({
		datetime: {
			hour: 15,
			minute: 0,
		},
	});
	expect(parseADatetime('5 days ago', ['en'], new Date(2023, 1 - 1, 20))).toStrictEqual({
		datetime: {
			day: 15,
			month: 1,
			year: 2023,
		},
	});
	expect(parseADatetime('Sat Aug 17 2013 18:40:39 GMT+0900 (JST)', ['en'])).toStrictEqual({
		datetime: {
			day: 17,
			hour: 18,
			minute: 40,
			month: 8,
			second: 39,
			year: 2013,
		},
		zone: 540,
	});

	expect(parseADatetime('午後2時', ['en', 'ja'])).toStrictEqual({
		datetime: {
			hour: 14,
			minute: 0,
		},
	});

	// attributable to chrono
	expect(parseADatetime('2015', ['en'])).toStrictEqual(null);
	expect(parseADatetime('令和5年', ['ja'])).toStrictEqual(null);
});

test('getCandidateDatetimeString', () => {
	expect(getCandidateDatetimeString('2000/1/1')).toBe('2000-01-01');
	expect(getCandidateDatetimeString('1/2/2011')).toBe('2011-01-02');
	expect(getCandidateDatetimeString('2000/1/2 12:15')).toBe('2000-01-02T12:15');
	expect(getCandidateDatetimeString('3000/12/31 23:59:59.999')).toBe('3000-12-31T23:59:59.999');
	expect(getCandidateDatetimeString('Sat Aug 17 2013 18:40:39 GMT+0900 (JST)')).toBe('2013-08-17T18:40:39+0900');
	expect(getCandidateDatetimeString('2014-11-30T08:15:30-05:30')).toBe('2014-11-30T08:15:30-0530');
	expect(getCandidateDatetimeString('6:15PM, June 13, 2022')).toBe('2022-06-13T18:15');
	expect(getCandidateDatetimeString('昭和60年7月9日')).toBe('1985-07-09');
	expect(getCandidateDatetimeString('Le 5 juin 2001')).toBe('2001-06-05'); // cspell:disable-line
});
