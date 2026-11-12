import { translator } from '@markuplint/i18n';
import { i18n } from 'markuplint';
import { describe, expect, test } from 'vitest';

import { noTranslate } from './no-translate.js';

const t = translator(i18n('ja'));

describe('noTranslate', () => {
	test('shows a value that is a keyword as written in a list', () => {
		expect(t(['list', 'row', 'time'])).toBe('「リスト」「行」「時間」');
		expect(t(['list', 'row', 'time'].map(noTranslate))).toBe('「list」「row」「time」');
	});

	test('mixes with a word that is to be translated', () => {
		expect(t([noTranslate('list'), 'element'])).toBe('「list」「要素」');
	});

	test('keeps the value of a placeholder as written', () => {
		expect(t('{0} is {1}', noTranslate('name'), 'element')).toBe('nameは要素です');
	});

	test('shows a value with a percent sign as written, in a literal expectation', () => {
		expect(t([noTranslate('50%')])).toBe('「50%」');
		expect(t([noTranslate('%list%')])).toBe('「%list%」');
	});

	test('leaves an empty value empty', () => {
		expect(noTranslate('')).toBe('');
		expect(t([noTranslate('')])).toBe('「」');
	});

	test.each(['%', '%%', '%a', 'a%', '%%a', 'a%%', '%a%', '%list%', 'list%', '%list', 'list%x', '50%', 'a%b'])(
		'shows the value %j with percent signs as written',
		value => {
			expect(t([noTranslate(value)])).toBe(`「${value}」`);
			expect(t('{0} is {1}', noTranslate(value), 'element')).toBe(`${value}は要素です`);
		},
	);
});
