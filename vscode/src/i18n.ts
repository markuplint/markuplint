import type { LocaleSet, Translator } from '@markuplint/i18n';

import { translator } from '@markuplint/i18n';

export function t(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...args: Parameters<Translator>
) {
	const locale = process.env.VSCODE_NLS_CONFIG ? JSON.parse(process.env.VSCODE_NLS_CONFIG).locale : 'en';
	const localeSet = i18n(locale);
	return translator(localeSet)(...args);
}

function i18n(locale: string): LocaleSet {
	const langCode = locale.split('-')[0] ?? locale;
	const localeSet: LocaleSet = getLocaleSet(locale);
	return {
		...localeSet,
		locale: langCode ?? 'en',
	};
}

function getLocaleSet(langCode: string): LocaleSet {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const loadLocaleSet: LocaleSet | null = require(`../locales/${langCode}.json`);
		if (loadLocaleSet) {
			return loadLocaleSet;
		}
	} catch (_) {
		// Avoid
	}
	return require('../locales/en.json');
}
