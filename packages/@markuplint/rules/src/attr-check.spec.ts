import type { Translator } from '@markuplint/i18n';

import { translator } from '@markuplint/i18n';
import { i18n } from 'markuplint';
import { test, expect, beforeAll } from 'vitest';

import { valueCheck } from './attr-check.js';

let t: Translator;

beforeAll(async () => {
	const locale = await i18n('en');
	t = translator(locale);
});

test('OneCodePointChar List', () => {
	expect(
		valueCheck(t, 'accesskey', '@ 12', {
			token: 'OneCodePointChar',
			separator: 'space',
			unique: true,
		}),
	).toStrictEqual([
		'the "accesskey" attribute expects space-separated list. the the content of the list part includes unexpected characters. It expects one code point character (https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute)',
		{
			col: 2,
			line: 0,
			raw: '12',
		},
	]);
});

test('BrowsingContextNameOrKeyword', () => {
	expect(valueCheck(t, 'target', '', 'BrowsingContextNameOrKeyword')).toStrictEqual([
		'the "target" attribute must not be empty. It expects either "_blank", "_self", "_parent", "_top", "browsing context name" (https://html.spec.whatwg.org/multipage/browsers.html#valid-browsing-context-name-or-keyword)',
		{
			col: 0,
			line: 0,
			raw: '',
		},
	]);
});

test('BCP47', () => {
	expect(valueCheck(t, 'lang', '', 'BCP47')).toStrictEqual([
		'the "lang" attribute must not be empty. It expects the BCP47 format (https://tools.ietf.org/rfc/bcp/bcp47.html)',
		{
			col: 0,
			line: 0,
			raw: '',
		},
	]);
});

test('DateTime', () => {
	expect(valueCheck(t, 'datetime', '200-1-1', 'DateTime')).toStrictEqual([
		'the year part of the "datetime" attribute expects four or more digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 0,
			line: 0,
			raw: '200',
		},
	]);
	expect(valueCheck(t, 'datetime', '2000-1-1', 'DateTime')).toStrictEqual([
		'the month part of the "datetime" attribute expects two digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 5,
			line: 0,
			raw: '1',
		},
	]);
	expect(valueCheck(t, 'datetime', '00:00:00.0000', 'DateTime')).toStrictEqual([
		'the fractional part part of the "datetime" attribute expects one to three digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 9,
			line: 0,
			raw: '0000',
		},
	]);
});

test('Directive', () => {
	const directive = {
		directive: ['find '],
		token: '<complex-selector-list>',
	} as const;
	expect(valueCheck(t, 'x-attr', 'find #id', directive)).toBeFalsy();
	expect(valueCheck(t, 'x-attr', 'fin #id', directive)).toStrictEqual([
		'Missing a token. the "x-attr" attribute needs a directive',
		{
			col: 0,
			line: 0,
			raw: 'fin #id',
		},
	]);
});
