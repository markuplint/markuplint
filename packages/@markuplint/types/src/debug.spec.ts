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
	expect(() => cssSyntaxMatch('x', '<no-such-type>')).toThrow('MARKUPLINT_TYPE_NO_EXIST');
	expect(mocks.log).not.toHaveBeenCalled();

	mocks.log.enabled = true;
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
