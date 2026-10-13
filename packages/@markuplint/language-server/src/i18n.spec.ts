import { afterEach, describe, expect, test, vi } from 'vitest';

import { getLocale, setLocale, t } from './i18n.js';

afterEach(() => {
	setLocale('en');
});

describe('t', () => {
	test('translates with the locale the client sent', () => {
		setLocale('ja');
		expect(t('Unknown')).toBe('不明');
	});

	test.each(['ja-JP', 'ja_JP', 'JA'])('uses the language of the region-qualified locale %s', locale => {
		setLocale(locale);
		expect(t('Unknown')).toBe('不明');
	});

	test('keeps English for a language it has no translation for', () => {
		setLocale('fr-FR');
		expect(t('Unknown')).toBe('Unknown');
	});

	test.each(['../../package', '../locales/ja', 'ja/../../x', ''])(
		'never reads a file outside the locales for the locale %j',
		locale => {
			setLocale(locale);
			expect(t('Unknown')).toBe('Unknown');
		},
	);
});

describe('without a locale from the client', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	test('falls back to the locale of the VS Code extension host', async () => {
		vi.stubEnv('VSCODE_NLS_CONFIG', '{"locale":"ja"}');
		vi.resetModules();
		const fresh = await import('./i18n.js');
		expect(fresh.t('Unknown')).toBe('不明');
	});

	test('falls back to English without the environment variable', async () => {
		vi.stubEnv('VSCODE_NLS_CONFIG', '');
		vi.resetModules();
		const fresh = await import('./i18n.js');
		expect(fresh.getLocale()).toBe('en');
	});
});

describe('getLocale', () => {
	test('returns the locale the client sent', () => {
		setLocale('ja-JP');
		expect(getLocale()).toBe('ja-JP');
	});
});
