import { test, expect } from 'vitest';

import { checkLinkType } from './check-link-type.js';

const noOptionsCheck = checkLinkType();
const forLinkElement = checkLinkType({ el: 'link' });
const forLinkElementInBody = checkLinkType({ el: 'body link' });
const forAnchorAndAreaElement = checkLinkType({ el: 'a, area' });
const forFormElement = checkLinkType({ el: 'form' });

test('noOptionsCheck', () => {
	expect(() => noOptionsCheck('')).toThrow();
});

test('forLinkElement', () => {
	expect(forLinkElement('alternate').matched).toBe(true);
	expect(forLinkElement('canonical').matched).toBe(true);
	expect(forLinkElement('author').matched).toBe(true);
	expect(forLinkElement('bookmark').matched).toBe(false);
	expect(forLinkElement('dns-prefetch').matched).toBe(true);
	expect(forLinkElement('expect').matched).toBe(true);
	expect(forLinkElement('help').matched).toBe(true);
	expect(forLinkElement('service').matched).toBe(true);
	expect(forLinkElement('alternate canonical author').matched).toBe(true);
	expect(forLinkElement('alternate canonical author dns-prefetch').matched).toBe(true);
	expect(forLinkElement('alternate canonical author dns-prefetch expect').matched).toBe(true);
	expect(forLinkElement('alternate canonical author dns-prefetch expect help').matched).toBe(true);
});

test('forLinkElementInBody', () => {
	expect(forLinkElementInBody('alternate').matched).toBe(false);
	expect(forLinkElementInBody('canonical').matched).toBe(false);
	expect(forLinkElementInBody('author').matched).toBe(false);
	expect(forLinkElementInBody('bookmark').matched).toBe(false);
	expect(forLinkElementInBody('dns-prefetch').matched).toBe(true);
	expect(forLinkElementInBody('modulepreload').matched).toBe(true);
	expect(forLinkElementInBody('pingback').matched).toBe(true);
	expect(forLinkElementInBody('bookmark dns-prefetch').matched).toBe(false);
});

test('forAnchorAndAreaElement', () => {
	expect(forAnchorAndAreaElement('alternate').matched).toBe(true);
	expect(forAnchorAndAreaElement('canonical').matched).toBe(false);
	expect(forAnchorAndAreaElement('author').matched).toBe(true);
	expect(forAnchorAndAreaElement('bookmark').matched).toBe(true);
	expect(forAnchorAndAreaElement('dns-prefetch').matched).toBe(false);
	expect(forAnchorAndAreaElement('modulepreload').matched).toBe(false);
	expect(forAnchorAndAreaElement('pingback').matched).toBe(false);
	expect(forAnchorAndAreaElement('disclosure').matched).toBe(true);
	expect(forAnchorAndAreaElement('service').matched).toBe(false);
});

test('forFormElement', () => {
	expect(forFormElement('alternate').matched).toBe(false);
	expect(forFormElement('canonical').matched).toBe(false);
	expect(forFormElement('author').matched).toBe(false);
	expect(forFormElement('bookmark').matched).toBe(false);
	expect(forFormElement('dns-prefetch').matched).toBe(false);
	expect(forFormElement('modulepreload').matched).toBe(false);
	expect(forFormElement('pingback').matched).toBe(false);
	expect(forFormElement('license').matched).toBe(true);
});

test('Dropped', () => {
	expect(forLinkElement('self').matched).toBe(false);
	expect(forLinkElement('sub').matched).toBe(false);
	expect(forLinkElement('version-history').matched).toBe(false);
	expect(forLinkElement('latest-version').matched).toBe(false);
	expect(forLinkElement('banner').matched).toBe(false);
	expect(forLinkElement('footnote').matched).toBe(false);
	expect(forLinkElement('first').matched).toBe(false);
	expect(forLinkElement('alternate logo')).toStrictEqual({
		expects: [
			{
				type: 'common',
				value: 'valid Link Type',
			},
		],
		line: 1,
		column: 11,
		offset: 10,
		length: 4,
		matched: false,
		raw: 'logo',
		reason: 'unexpected-token',
		ref: null,
	});
});
