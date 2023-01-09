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
	locale = locale || (await getLocale()) || 'en';
	const langCode = locale.split('-')[0];

	const loadLocaleSet: Omit<LocaleSet, 'locale'> | null =
		(
			await import(`@markuplint/i18n/locales/${langCode}.json`, {
				assert: {
					type: 'json',
				},
			}).catch(() => null)
		)?.default || null;

	const localeSet: Omit<LocaleSet, 'locale'> =
		loadLocaleSet ||
		(
			await import('@markuplint/i18n/locales/en.json', {
				assert: {
					type: 'json',
				},
			})
		).default;

	return {
		locale: loadLocaleSet ? langCode : 'en',
		...localeSet,
	};
}
