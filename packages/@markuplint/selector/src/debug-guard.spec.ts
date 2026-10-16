// @ts-nocheck -- assigns jsdom's `Element` onto `globalThis` and passes DOM nodes where `SelectorNode` is expected

import debug from 'debug';
import { JSDOM } from 'jsdom';
import parser from 'postcss-selector-parser';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { log } from './debug.js';
import { Selector } from './selector.js';

function written(write: { mock: { calls: unknown[][] } }) {
	return write.mock.calls.map(([chunk]) => String(chunk)).join('');
}

/**
 * The prototype that owns `toString` for postcss-selector-parser nodes. `SelectorTarget#toString` and the
 * debug-only `selector` getter both stringify through it, so counting calls shows whether log arguments are built.
 */
function nodeToStringOwner() {
	let proto = Object.getPrototypeOf(parser.tag({ value: 'x' }));
	while (proto && !Object.prototype.hasOwnProperty.call(proto, 'toString')) {
		proto = Object.getPrototypeOf(proto);
	}
	return proto;
}

describe('Selector debug logging', () => {
	beforeEach(() => {
		globalThis.Element = new JSDOM().window.Element;
	});

	afterEach(() => {
		debug.disable();
		// `debug` keeps `enabled = null` as "no override"; any other value, `undefined` included, pins the logger.
		log.enabled = null;
		vi.restoreAllMocks();
	});

	test('does not build log arguments while the logger is disabled', () => {
		debug.disable();
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const selector = new Selector('section div');
		const el = JSDOM.fragment('<section><div></div></section>').firstChild.firstChild;
		const original = nodeToStringOwner().toString;
		const toString = vi.spyOn(nodeToStringOwner(), 'toString').mockImplementation(original);

		const result = selector.match(el);

		expect(result).toStrictEqual([0, 0, 2]);
		expect(toString).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	test('emits the ruleset and result messages once the logger is enabled after import', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector*');
		const el = JSDOM.fragment('<div></div>').firstChild;

		const result = new Selector('div').match(el);

		expect(result).toStrictEqual([0, 0, 1]);
		expect(written(write)).toContain('selector:selector');
		expect(written(write)).toContain('selector:result');
	});

	test('follows a partial namespace pattern instead of treating all three loggers alike', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector:result');
		const el = JSDOM.fragment('<div></div>').firstChild;

		new Selector('div').match(el);

		expect(written(write)).toContain('selector:result');
		expect(written(write)).not.toContain('selector:selector');
		expect(written(write)).not.toContain('The DIV element');
		// The core logger (namespace `selector`) writes `<div> (div)`; it must stay off.
		expect(written(write)).not.toContain('<div> (');
	});

	test('enables only the selector logger when the pattern names just that namespace', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector:selector');
		const el = JSDOM.fragment('<div></div>').firstChild;

		new Selector('div').match(el);

		expect(written(write)).toContain('The DIV element');
		expect(written(write)).not.toContain('selector:result');
		expect(written(write)).not.toContain('<div> (');
	});

	test('honours a skip pattern', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector*,-selector:result');
		const el = JSDOM.fragment('<div></div>').firstChild;

		new Selector('div').match(el);

		expect(written(write)).toContain('The DIV element');
		expect(written(write)).not.toContain('selector:result');
	});

	test('recomputes the flags when the pattern is replaced between two matches', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const el = JSDOM.fragment('<div></div>').firstChild;
		debug.enable('selector:result');
		new Selector('div').match(el);
		expect(written(write)).toContain('selector:result');
		expect(written(write)).not.toContain('The DIV element');
		write.mockClear();

		debug.enable('selector:selector');
		new Selector('div').match(el);

		expect(written(write)).toContain('The DIV element');
		expect(written(write)).not.toContain('selector:result');
	});

	// Documents the trade-off described on `readFlags()`: the flags are keyed on `debug.names`, which only
	// `debug.enable()` / `debug.disable()` replace, so pinning `logger.enabled` by hand is not seen in between.
	test('does not see a manual `enabled` override until the next enable() or disable()', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const el = JSDOM.fragment('<div></div>').firstChild;
		debug.disable();
		new Selector('div').match(el);

		log.enabled = true;
		new Selector('div').match(el);

		expect(write).not.toHaveBeenCalled();

		debug.disable();
		new Selector('div').match(el);

		expect(written(write)).toContain('<div> (');
	});

	test('stops writing once the logger is disabled again', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const el = JSDOM.fragment('<div></div>').firstChild;
		debug.enable('selector*');
		new Selector('div').match(el);
		write.mockClear();

		debug.disable();
		new Selector('div').match(el);

		expect(write).not.toHaveBeenCalled();
	});

	// The `(1)` message is only written when `logEnabled` reaches the recursive `SelectorTarget.match()` call.
	test.each([
		['div', '<div></div>', ['The DIV element by "div" => true (0)']],
		[
			'section div',
			'<section><div></div></section>',
			['The SECTION element by "section" => true (1)', 'The DIV element by "section ␣" => true (0)'],
		],
		[
			'section > div',
			'<section><div></div></section>',
			['The SECTION element by "section" => true (1)', 'The DIV element by "section >" => true (0)'],
		],
	])('threads the enabled flag through the target recursion for "%s"', (selector, html, messages) => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector*');
		const fragment = JSDOM.fragment(html);
		const el = fragment.firstChild.firstChild ?? fragment.firstChild;
		const original = nodeToStringOwner().toString;
		const toString = vi.spyOn(nodeToStringOwner(), 'toString').mockImplementation(original);

		new Selector(selector).match(el);

		expect(toString).toHaveBeenCalled();
		for (const message of messages) {
			expect(written(write)).toContain(message);
		}
	});
});
