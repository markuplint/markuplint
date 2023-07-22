import type { LocaleSet } from '@markuplint/i18n';

import { osLocale } from 'os-locale';

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
	const loadLocaleSet: LocaleSet | null = await import(`@markuplint/i18n/locales/${langCode}.json`).catch(() => null);
	// @ts-ignore
	const localeSet: LocaleSet =
		loadLocaleSet ??
		// @ts-ignore
		(await import('@markuplint/i18n/locales/en.json'));
	return {
		...localeSet,
		locale: loadLocaleSet ? langCode : 'en',
	};
}
