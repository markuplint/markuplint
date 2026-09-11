// @ts-nocheck

import { test, expect } from 'vitest';

import { checkDateStringWithOptionalTime } from './date-string-with-optional-time.js';

const isDateStringWithOptionalTime = checkDateStringWithOptionalTime();

test('accepts a valid date string', () => {
	expect(isDateStringWithOptionalTime('2000-01-01').matched).toBe(true);
	expect(isDateStringWithOptionalTime('2025-12-31').matched).toBe(true);
});

test('accepts a valid global date and time string', () => {
	expect(isDateStringWithOptionalTime('2000-01-01T00:00Z').matched).toBe(true);
	expect(isDateStringWithOptionalTime('2000-01-01T00:00+00:00').matched).toBe(true);
	expect(isDateStringWithOptionalTime('2011-11-12T14:54:39.929+0000').matched).toBe(true);
});

// Reject the subforms that the catch-all `DateTime` would accept but the
// `<del>` / `<ins>` `datetime` spec does not. Fixture-derived values cover
// each shape that nu-validator currently flags as nu-only for these elements.
test('rejects a date string without hyphens', () => {
	expect(isDateStringWithOptionalTime('20020929').matched).toBe(false);
});

test('rejects a duration P-form string', () => {
	expect(isDateStringWithOptionalTime('PT4H18M3S').matched).toBe(false);
});

test('rejects a duration component-list string', () => {
	expect(isDateStringWithOptionalTime('4h 18m 3s').matched).toBe(false);
});

test('rejects a global date and time with comma fraction separator', () => {
	expect(isDateStringWithOptionalTime('2011-11-12T14:54:39,929+0000').matched).toBe(false);
});

test('rejects a local date and time string (no timezone)', () => {
	expect(isDateStringWithOptionalTime('2011-11-12T14:54').matched).toBe(false);
});

test('rejects a month-only string', () => {
	expect(isDateStringWithOptionalTime('2011-11').matched).toBe(false);
});

test('rejects a time-only string', () => {
	expect(isDateStringWithOptionalTime('14:54:39').matched).toBe(false);
});

test('rejects a week string', () => {
	expect(isDateStringWithOptionalTime('2011-W46').matched).toBe(false);
});

test('rejects a year-only string', () => {
	expect(isDateStringWithOptionalTime('2006').matched).toBe(false);
});

test('rejects a yearless date string', () => {
	expect(isDateStringWithOptionalTime('07-15').matched).toBe(false);
});
