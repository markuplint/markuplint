import fs from 'fs';
import path from 'path';


import osLocale from '../osLocale';

import Messenger, { LocaleSet } from './';

import readTextFile from '../../util/readTextFile';

export default async function (locale?: string) {
	if (!locale) {
		locale = await osLocale();
	}

	const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();

	if (localeId === 'en') {
		return Messenger.create(null);
	}

	let json = '{}';
	try {
		const filePath = path.join(__dirname, '..', 'i18n', `${localeId}.json`);
		json = await readTextFile(filePath);
	} catch (err) {
		console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
	}

	const localeSet: LocaleSet = await JSON.parse(json);

	return Messenger.create(localeSet);
}
