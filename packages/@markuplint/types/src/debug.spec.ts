import { beforeEach, expect, test, vi } from 'vitest';

/**
 * `./debug.js` is replaced by bare `vi.fn()` loggers: `log` and the one child `extend()` hands out
 * (`check-autocomplete.ts` creates its logger at import time). Any other `Debugger` member is unsupported
 * by design — a new use of one in a module reached from here must be added to this mock.
 */
const mocks = vi.hoisted(() => {
	const child = Object.assign(vi.fn(), { enabled: false });
	const log = Object.assign(vi.fn(), { enabled: false, extend: () => child });
	return { log, child };
});

vi.mock('./debug.js', () => ({ log: mocks.log }));

const { cssSyntaxMatch } = await import('./css-syntax.js');
const { checkAutoComplete } = await import('./whatwg/check-autocomplete.js');
const { checkDateTime } = await import('./whatwg/check-datetime/index.js');

beforeEach(() => {
	mocks.log.mockClear();
	mocks.child.mockClear();
	mocks.log.enabled = false;
	mocks.child.enabled = false;
});

test('[types-debug-001] a disabled logger is never called', () => {
	expect(cssSyntaxMatch('10px', '<length>').matched).toBe(true);
	expect(mocks.log).not.toHaveBeenCalled();
});

test('[types-debug-002] `enabled` is read at call time, so enabling later emits messages', () => {
	cssSyntaxMatch('10px', '<length>');
	expect(mocks.log).not.toHaveBeenCalled();

	mocks.log.enabled = true;
	cssSyntaxMatch('10px', '<length>');
	expect(mocks.log).toHaveBeenCalledWith('Search CSS Syntax: "%s"', '<length>');
});

test('[types-debug-003] the not-found branch logs only while the logger is enabled', () => {
	// @ts-expect-error An unknown CSS syntax name is passed on purpose
	expect(() => cssSyntaxMatch('x', '<no-such-type>')).toThrow('MARKUPLINT_TYPE_NO_EXIST');
	expect(mocks.log).not.toHaveBeenCalled();

	mocks.log.enabled = true;
	// @ts-expect-error An unknown CSS syntax name is passed on purpose
	expect(() => cssSyntaxMatch('x', '<no-such-type>')).toThrow('MARKUPLINT_TYPE_NO_EXIST');
	expect(mocks.log).toHaveBeenCalledWith('"%s" CSS syntax not found', '<no-such-type>');
});

test('[types-debug-004] a disabled logger is never called by the datetime and autocomplete checkers', () => {
	const results = [
		checkDateTime()('2020-01-01T10:00:00Z'),
		checkDateTime()('not-a-datetime'),
		checkAutoComplete()('on'),
		checkAutoComplete()('shipping not-a-field'),
	].map(result => result.matched);

	expect(results).toStrictEqual([true, false, true, false]);
	expect(mocks.log).not.toHaveBeenCalled();
	expect(mocks.child).not.toHaveBeenCalled();
});

const { check } = await import('./check.js');
const { checkKeywordType } = await import('./keyword-type.js');
const { checkMultiTypes } = await import('./check-multi-types.js');
const { checkContentSecurityPolicy } = await import('./w3c/check-content-security-policy.js');
const { checkSerializedPermissionsPolicy } = await import('./w3c/check-serialized-permissions-policy.js');
const { checkURL } = await import('./whatwg/check-url.js');
const { checkHTTPEquivContentType } = await import('./whatwg/check-http-equiv-content-type.js');
const { checkHTTPEquivRefresh } = await import('./whatwg/check-http-equiv-refresh.js');
const { checkYearString } = await import('./whatwg/check-datetime/year-string.js');
const { checkMonthString } = await import('./whatwg/check-datetime/month-string.js');
const { checkWeekString } = await import('./whatwg/check-datetime/week-string.js');
const { checkTimeString } = await import('./whatwg/check-datetime/time-string.js');
const { checkTimeZoneOffsetString } = await import('./whatwg/check-datetime/time-zone-offset-string.js');
const { checkDateString } = await import('./whatwg/check-datetime/date-string.js');
const { checkYearlessDateString } = await import('./whatwg/check-datetime/yearless-date-string.js');
const { checkGlobalDateAndTimeString } = await import('./whatwg/check-datetime/global-date-and-time-string.js');
const { checkLocalDateAndTimeString, checkNormalizedLocalDateAndTimeString } =
	await import('./whatwg/check-datetime/local-date-and-time-string.js');
const { checkDurationISO8601LikeString, checkDurationComponentListString } =
	await import('./whatwg/check-datetime/duration-string.js');

type Verdict = { readonly matched: boolean };

/**
 * One input the checker accepts and one it rejects, each with the verdict it must return, so the pass and the
 * failure branches are both hit and a changed verdict is noticed.
 */
const guardedEntryPoints: readonly (readonly [name: string, accept: () => Verdict, reject: () => Verdict])[] = [
	[
		'checkBase keyword',
		() => check('10px', '<length>', undefined, false),
		() => check('x', '<length>', undefined, false),
	],
	[
		'checkBase list',
		() => check('a b', { token: { enum: ['a', 'b'] }, separator: 'space' }, undefined, false),
		() => check('a c', { token: { enum: ['a', 'b'] }, separator: 'space' }, undefined, false),
	],
	[
		'checkBase enum',
		() => check('a', { enum: ['a', 'b'] }, undefined, false),
		() => check('c', { enum: ['a', 'b'] }, undefined, false),
	],
	[
		'checkBase number',
		() => check('10', { type: 'integer', gt: 0 }, undefined, false),
		() => check('0', { type: 'integer', gt: 0 }, undefined, false),
	],
	[
		'checkBase directive',
		() => check('next #id', { directive: ['next '], token: '<complex-selector-list>' }, undefined, false),
		() => check('next >>', { directive: ['next '], token: '<complex-selector-list>' }, undefined, false),
	],
	[
		'checkBase pattern',
		() => check('foo', { pattern: 'foo' }, undefined, false),
		() => check('bar', { pattern: 'foo' }, undefined, false),
	],
	[
		'checkKeywordType',
		() => checkKeywordType('10px', '<length>' as never, {}, false),
		() => checkKeywordType('x', '<length>' as never, {}, false),
	],
	[
		'checkMultiTypes',
		() => checkMultiTypes('2020', [checkYearString(), checkMonthString()]),
		() => checkMultiTypes('x', [checkYearString(), checkMonthString()]),
	],
	[
		'checkContentSecurityPolicy',
		() => checkContentSecurityPolicy()("default-src 'self'"),
		() => checkContentSecurityPolicy()('x y z'),
	],
	[
		'checkSerializedPermissionsPolicy',
		() => checkSerializedPermissionsPolicy()('a *'),
		() => checkSerializedPermissionsPolicy()('a:'),
	],
	['checkURL', () => checkURL()('https://example.com/'), () => checkURL()('http://')],
	[
		'checkHTTPEquivContentType',
		() => checkHTTPEquivContentType()('text/html; charset=utf-8'),
		() => checkHTTPEquivContentType()('x'),
	],
	[
		'checkHTTPEquivRefresh',
		() => checkHTTPEquivRefresh()('5; url=https://example.com/'),
		() => checkHTTPEquivRefresh()('x'),
	],
	['checkYearString', () => checkYearString()('2020'), () => checkYearString()('abc')],
	['checkMonthString', () => checkMonthString()('2020-01'), () => checkMonthString()('2020-13')],
	['checkWeekString', () => checkWeekString()('2020-W10'), () => checkWeekString()('2020-W99')],
	['checkTimeString', () => checkTimeString()('10:00'), () => checkTimeString()('25:00')],
	[
		'checkTimeZoneOffsetString',
		() => checkTimeZoneOffsetString()('+09:00'),
		() => checkTimeZoneOffsetString()('+99:99'),
	],
	['checkDateString', () => checkDateString()('2020-01-01'), () => checkDateString()('2020-13-01')],
	['checkYearlessDateString', () => checkYearlessDateString()('01-01'), () => checkYearlessDateString()('13-01')],
	[
		'checkGlobalDateAndTimeString',
		() => checkGlobalDateAndTimeString()('2020-01-01T10:00Z'),
		() => checkGlobalDateAndTimeString()('x'),
	],
	[
		'checkLocalDateAndTimeString',
		() => checkLocalDateAndTimeString()('2020-01-01T10:00'),
		() => checkLocalDateAndTimeString()('x'),
	],
	[
		'checkNormalizedLocalDateAndTimeString',
		() => checkNormalizedLocalDateAndTimeString()('2020-01-01T10:00'),
		() => checkNormalizedLocalDateAndTimeString()('x'),
	],
	[
		'checkDurationISO8601LikeString',
		() => checkDurationISO8601LikeString()('PT1H'),
		() => checkDurationISO8601LikeString()('xyz'),
	],
	[
		'checkDurationComponentListString',
		() => checkDurationComponentListString()('1h 30m'),
		() => checkDurationComponentListString()('xyz'),
	],
];

test.each(guardedEntryPoints)(
	'[types-debug-005] a disabled logger is never called by %s, and its verdicts hold',
	(_name, accept, reject) => {
		expect([accept().matched, reject().matched]).toStrictEqual([true, false]);

		expect(mocks.log).not.toHaveBeenCalled();
		expect(mocks.child).not.toHaveBeenCalled();
	},
);

test.each(guardedEntryPoints)(
	'[types-debug-006] an enabled logger is called by %s for an accepted input',
	(_name, accept) => {
		mocks.log.enabled = true;

		expect(accept().matched).toBe(true);

		expect(mocks.log).toHaveBeenCalled();
	},
);

test.each(guardedEntryPoints)(
	'[types-debug-007] an enabled logger is called by %s for a rejected input',
	(_name, _accept, reject) => {
		mocks.log.enabled = true;

		expect(reject().matched).toBe(false);

		expect(mocks.log).toHaveBeenCalled();
	},
);
