import path from 'path';

import osLocale from '../osLocale';

import Messenger, { LocaleSet } from '.';

import readTextFile from '../../util/read-text-file';

export default async function(locale?: string) {
	if (!locale) {
		locale = await osLocale();
	}

	const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();

	if (localeId === 'en') {
		return Messenger.create(null);
	}

	let localeSet: LocaleSet;
	const filePath = path.join(__dirname, '..', '..', '..', 'i18n', `${localeId}.json`);

	try {
		const json = await readTextFile(filePath);
		localeSet = await JSON.parse(json);
	} catch (err) {
		localeSet = {
			locale: '',
			keywords: {},
		};
		console.warn(
			`⚠ [markuplint] Missing locale message file ${filePath}`,
		);
	}

	return Messenger.create(localeSet);
}
