import { LocaleSet, Messenger } from '@markuplint/i18n';
import osLocale from 'os-locale';

let cachedLocale: string | null = null;

async function getLocale() {
	if (!cachedLocale) {
		// eslint-disable-next-line require-atomic-updates
		cachedLocale = await osLocale({ spawn: true });
	}
	return cachedLocale;
}

export async function getMessenger(locale?: string) {
	locale = locale || (await getLocale());
	const localeSet: LocaleSet | null = locale
		? await import(`@markuplint/i18n/locales/${locale}`).catch(() => null)
		: null;
	return Messenger.create(localeSet);
}
