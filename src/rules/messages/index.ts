import * as fs from 'fs';
import * as util from 'util';

import * as stripJsonComments from 'strip-json-comments';

const readFile = util.promisify(fs.readFile);

interface LocaleSet {
	keywords: LocalesKeywords;
	[messageId: string]: string | void | LocalesKeywords;
}

interface LocalesKeywords {
	[messageId: string]: string | void;
}

export default async function (locale: string, messageTmpl: string, ...keywords: string[]) {
	const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();
	const localeSet = await getLocaleSet(localeId);

	let message = messageTmpl;
	if (localeSet) {
		const t = localeSet[messageTmpl];
		if (typeof t === 'string') {
			messageTmpl = t;
		}
	} else if (localeId !== 'en') {
		console.warn(`⚠ [markuplint] Undefined "${messageTmpl}" in locale(${locale}) message file`);
	}

	message = messageTmpl.replace(/\{([0-9]+)\}/g, ($0, $1) => {
		const keyword = keywords[+$1] || '';
		if (localeSet) {
			return localeSet.keywords[keyword] || keyword;
		}
		return keyword;
	});

	return message;
}

async function getLocaleSet (localeId: string) {

	if (localeId === 'en') {
		return null;
	}

	let json: string;
	try {
		json = await readFile(`${__dirname}/${localeId}.json`, 'utf-8');
	} catch (err) {
		console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
		return null;
	}

	const localeSet: LocaleSet = await JSON.parse(stripJsonComments(json));
	return localeSet;
}
