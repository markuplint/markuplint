import { test, expect, describe } from 'vitest';

import { check } from '../check.js';

describe('DateString', () => {
	test('valid: full date', () => {
		expect(check('2024-01-15', 'DateString').matched).toBe(true);
	});

	test('invalid: month only', () => {
		expect(check('2024-01', 'DateString').matched).toBe(false);
	});

	test('invalid: time string', () => {
		expect(check('12:30', 'DateString').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'DateString').matched).toBe(false);
	});
});

describe('TimeString', () => {
	test('valid: hh:mm', () => {
		expect(check('12:30', 'TimeString').matched).toBe(true);
	});

	test('valid: hh:mm:ss', () => {
		expect(check('12:30:45', 'TimeString').matched).toBe(true);
	});

	test('valid: hh:mm:ss.sss', () => {
		expect(check('12:30:45.123', 'TimeString').matched).toBe(true);
	});

	test('invalid: date string', () => {
		expect(check('2024-01-15', 'TimeString').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'TimeString').matched).toBe(false);
	});
});

describe('MonthString', () => {
	test('valid: YYYY-MM', () => {
		expect(check('2024-01', 'MonthString').matched).toBe(true);
	});

	test('invalid: full date', () => {
		expect(check('2024-01-15', 'MonthString').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'MonthString').matched).toBe(false);
	});
});

describe('WeekString', () => {
	test('valid: YYYY-Www', () => {
		expect(check('2024-W03', 'WeekString').matched).toBe(true);
	});

	test('invalid: date string', () => {
		expect(check('2024-01-15', 'WeekString').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'WeekString').matched).toBe(false);
	});
});

describe('LocalDateTimeString', () => {
	test('valid: with T separator', () => {
		expect(check('2024-01-15T12:30', 'LocalDateTimeString').matched).toBe(true);
	});

	test('valid: with space separator', () => {
		expect(check('2024-01-15 12:30', 'LocalDateTimeString').matched).toBe(true);
	});

	test('valid: with seconds', () => {
		expect(check('2024-01-15T12:30:45', 'LocalDateTimeString').matched).toBe(true);
	});

	test('invalid: date only', () => {
		expect(check('2024-01-15', 'LocalDateTimeString').matched).toBe(false);
	});

	test('invalid: time only', () => {
		expect(check('12:30', 'LocalDateTimeString').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'LocalDateTimeString').matched).toBe(false);
	});
});

describe('DateStringWithOptionalTime', () => {
	test('valid: full date', () => {
		expect(check('2024-01-15', 'DateStringWithOptionalTime').matched).toBe(true);
	});

	test('valid: global date and time', () => {
		expect(check('2024-01-15T12:30:00Z', 'DateStringWithOptionalTime').matched).toBe(true);
	});

	test('invalid: month only', () => {
		expect(check('2024-01', 'DateStringWithOptionalTime').matched).toBe(false);
	});

	test('invalid: local date and time (no timezone)', () => {
		expect(check('2024-01-15T12:30', 'DateStringWithOptionalTime').matched).toBe(false);
	});

	test('invalid: empty', () => {
		expect(check('', 'DateStringWithOptionalTime').matched).toBe(false);
	});
});
