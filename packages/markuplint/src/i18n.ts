import { I18n, LocaleSet } from '@markuplint/i18n';
import osLocale from 'os-locale';

let cachedLocale: string | null = null;

async function getLocale() {
	if (!cachedLocale) {
		cachedLocale = await osLocale({ spawn: true });
	}
	return cachedLocale;
}

function getLocaleSync() {
	if (!cachedLocale) {
		cachedLocale = osLocale.sync({ spawn: true });
	}
	return cachedLocale;
}

export async function i18n(locale?: string) {
	locale = locale || (await getLocale()) || '';
	const langCode = locale.split('-')[0];
	const localeSet: LocaleSet | null = langCode
		? await import(`@markuplint/i18n/locales/${langCode}`).catch(() => null)
		: null;
	return I18n.create(localeSet);
}

export function i18nSync(locale?: string) {
	locale = locale || getLocaleSync() || '';
	const langCode = locale.split('-')[0];
	let localeSet: LocaleSet | null = null;
	if (langCode) {
		try {
			localeSet = require(`@markuplint/i18n/locales/${langCode}`);
		} catch {
			// ignore
		}
	}
	return I18n.create(localeSet);
}
