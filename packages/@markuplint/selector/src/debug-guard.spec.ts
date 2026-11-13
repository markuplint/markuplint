import type { SelectorElement } from './types.js';

import debug from 'debug';
import parser from 'postcss-selector-parser';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { log } from './debug.js';
import { Selector } from './selector.js';

const XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * An element of a tree that the spec builds by hand: `selector` reads the tree through `SelectorElement`.
 */
function elementOf(html: string, picked?: string): SelectorElement {
	const tags = [...html.matchAll(/<([a-z]+)>/g)].map(m => m[1]!);
	let parent: SelectorElement | null = null;
	let last: SelectorElement | null = null;
	for (const tag of tags) {
		const el: SelectorElement & { childElements: SelectorElement[] } = {
			nodeType: 1,
			nodeName: tag.toUpperCase(),
			localName: tag,
			id: '',
			namespaceURI: XHTML,
			classList: { contains: () => false },
			attributes: [],
			parent,
			parentElement: parent,
			prevElementSibling: null,
			nextElementSibling: null,
			childElements: [],
			getAccessibleName: () => '',
		};
		(parent as (SelectorElement & { childElements: SelectorElement[] }) | null)?.childElements.push(el);
		parent = el;
		last = el;
		if (picked === tag) {
			return el;
		}
	}
	if (!last) {
		throw new Error('An element is not created');
	}
	return last;
}

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
	afterEach(() => {
		debug.disable();
		// `debug` keeps `enabled = null` as "no override"; any other value, `undefined` included, pins the logger.
		(log as { enabled: boolean | null }).enabled = null;
		vi.restoreAllMocks();
	});

	test('does not build log arguments while the logger is disabled', () => {
		debug.disable();
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const selector = new Selector('section div');
		const el = elementOf('<section><div></div></section>', 'div');
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
		const el = elementOf('<div></div>');

		const result = new Selector('div').match(el);

		expect(result).toStrictEqual([0, 0, 1]);
		expect(written(write)).toContain('selector:selector');
		expect(written(write)).toContain('selector:result');
	});

	test('follows a partial namespace pattern instead of treating all three loggers alike', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector:result');
		const el = elementOf('<div></div>');

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
		const el = elementOf('<div></div>');

		new Selector('div').match(el);

		expect(written(write)).toContain('The DIV element');
		expect(written(write)).not.toContain('selector:result');
		expect(written(write)).not.toContain('<div> (');
	});

	test('honours a skip pattern', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('selector*,-selector:result');
		const el = elementOf('<div></div>');

		new Selector('div').match(el);

		expect(written(write)).toContain('The DIV element');
		expect(written(write)).not.toContain('selector:result');
	});

	test('recomputes the flags when the pattern is replaced between two matches', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const el = elementOf('<div></div>');
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
		const el = elementOf('<div></div>');
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
		const el = elementOf('<div></div>');
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
		const el = elementOf(html, 'div');
		const original = nodeToStringOwner().toString;
		const toString = vi.spyOn(nodeToStringOwner(), 'toString').mockImplementation(original);

		new Selector(selector).match(el);

		expect(toString).toHaveBeenCalled();
		for (const message of messages) {
			expect(written(write)).toContain(message);
		}
	});
});
