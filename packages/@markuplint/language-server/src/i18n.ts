import type { LocaleSet, Translator } from '@markuplint/i18n';

import { readFileSync } from 'node:fs';

import { translator } from '@markuplint/i18n';

let clientLocale: string | undefined;

/**
 * Sets the locale of the client, as sent in the `initialize` request.
 *
 * @param locale - A locale such as `en` or `ja-JP`
 */
export function setLocale(locale: string) {
	clientLocale = locale;
}

/**
 * Translates a message into the locale of the client.
 *
 * @param args - The arguments of the `@markuplint/i18n` translator: the message and its placeholder values
 * @returns The translated message, or the message itself without a translation
 */
export function t(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...args: Parameters<Translator>
) {
	const locale = getLocale();
	const localeSet = i18n(locale);
	return translator(localeSet)(...args);
}

/**
 * The locale of the client. The `VSCODE_NLS_CONFIG` environment variable of the VS Code extension
 * host is kept as the fallback for a client that does not send a locale.
 */
export function getLocale() {
	const locale: string = clientLocale ?? JSON.parse(process.env.VSCODE_NLS_CONFIG || '{}').locale ?? 'en';
	return locale;
}

/**
 * The language of a locale (`ja` for `ja-JP` or `ja_JP`).
 *
 * The locale arrives from the client, and the language names a file under `locales/`. Anything
 * but a two or three letter language falls back to English so the name can never leave that
 * directory.
 */
function toLanguage(locale: string): string {
	const language = (locale.split(/[-_]/)[0] ?? '').toLowerCase();
	return /^[a-z]{2,3}$/.test(language) ? language : 'en';
}

function i18n(locale: string): LocaleSet {
	const langCode = toLanguage(locale);
	const localeSet: LocaleSet = getLocaleSet(langCode);
	return {
		...localeSet,
		locale: langCode,
	};
}

function readLocaleFile(langCode: string): LocaleSet {
	return JSON.parse(readFileSync(new URL(`../locales/${langCode}.json`, import.meta.url), 'utf8'));
}

function getLocaleSet(langCode: string): LocaleSet {
	try {
		return readLocaleFile(langCode);
	} catch {
		// Avoid
	}
	return readLocaleFile('en');
}
