import { test, expect } from 'vitest';

import { i18n } from './i18n.js';

test('ja', async () => {
	const locale = await i18n('ja');

	expect(locale.locale).toBe('ja');
	expect(locale.keywords).toBeTruthy();
	expect(locale.sentences).toBeTruthy();
});

test('en', async () => {
	const locale = await i18n('en');

	expect(locale.locale).toBe('en');
	expect(locale.keywords).toBeTruthy();
	expect(locale.sentences).toBeFalsy();
});

test('fallback', async () => {
	const locale = await i18n('foo');

	expect(locale.locale).toBe('en');
	expect(locale.keywords).toBeTruthy();
	expect(locale.sentences).toBeFalsy();
});
