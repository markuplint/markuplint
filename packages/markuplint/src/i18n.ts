import type { LocaleSet } from '@markuplint/i18n';

import osLocale from 'os-locale';

import { getJsonModule } from './get-json-module.js';

let cachedLocale: string | null = null;

function getLocale() {
	if (!cachedLocale) {
		cachedLocale = osLocale();
	}
	return cachedLocale;
}

/**
 * Loads the locale-specific message set for use in violation messages.
 *
 * If no locale is provided, it auto-detects the OS locale. When the requested
 * locale is not available, it falls back to English (`en`).
 *
 * @param locale - An optional BCP 47 locale string (e.g., `"ja"`, `"en-US"`).
 * @returns The loaded locale set containing translated messages and the resolved locale code.
 */
// eslint-disable-next-line require-await, @typescript-eslint/require-await
export async function i18n(locale?: string): Promise<LocaleSet> {
	locale = locale ?? getLocale() ?? 'en';
	const langCode = locale.split('-')[0] ?? locale;
	const loadLocaleSet = getJsonModule<LocaleSet>(`@markuplint/i18n/locales/${langCode}.json`);
	const localeSet: LocaleSet = loadLocaleSet ?? getJsonModule('@markuplint/i18n/locales/en.json')!;
	return {
		...localeSet,
		locale: loadLocaleSet ? langCode : 'en',
	};
}
