// @ts-nocheck -- assigns jsdom's `Element` onto `globalThis` and passes DOM nodes where `SelectorNode` is expected

import debug from 'debug';
import { JSDOM } from 'jsdom';
import parser from 'postcss-selector-parser';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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
