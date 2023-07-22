import type { LocaleSet } from '@markuplint/i18n';

import { osLocale } from 'os-locale';

import { getJsonModule } from './get-json-module.js';

let cachedLocale: string | null = null;

async function getLocale() {
	if (!cachedLocale) {
		cachedLocale = await osLocale({ spawn: true });
	}
	return cachedLocale;
}

export async function i18n(locale?: string): Promise<LocaleSet> {
	locale = locale ?? (await getLocale()) ?? 'en';
	const langCode = locale.split('-')[0] ?? locale;
	const loadLocaleSet = getJsonModule<LocaleSet>(`@markuplint/i18n/locales/${langCode}.json`);
	const localeSet: LocaleSet = loadLocaleSet ?? getJsonModule('@markuplint/i18n/locales/en.json')!;
	return {
		...localeSet,
		locale: loadLocaleSet ? langCode : 'en',
	};
}
