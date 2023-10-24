import type { ListFormat, LocaleSet, Primitive, Translator } from './types.js';

const defaultListFormat: ListFormat = {
	quoteStart: '"',
	quoteEnd: '"',
	separator: ', ',
};

export function translator(localeSet?: LocaleSet): Translator {
	return (messageTmpl, ...keywords) => {
		let message = messageTmpl;

		if (typeof messageTmpl !== 'string') {
			const format = localeSet?.listFormat ?? defaultListFormat;
			return `${format.quoteStart}${messageTmpl
				.map(keyword => translateKeyword(keyword, '', localeSet))
				.join(`${format.quoteEnd}${format.separator}${format.quoteStart}`)}${format.quoteEnd}`;
		}

		const input = messageTmpl;

		if (keywords.length === 0) {
			return translateKeyword(messageTmpl, '', localeSet);
		}

		const noTranslateIndex = new Set(
			[
				...messageTmpl.matchAll(
					// eslint-disable-next-line regexp/strict
					/(?<={)\d+(?=\*})/g,
				),
			].map(m => m[0]),
		);
		const key = removeNoTranslateMark(messageTmpl).toLowerCase();

		const sentence = localeSet?.sentences?.[key];
		messageTmpl = sentence ?? key;
		messageTmpl =
			removeNoTranslateMark(input.toLowerCase()) === messageTmpl ? removeNoTranslateMark(input) : messageTmpl;

		message = messageTmpl.replaceAll(
			// eslint-disable-next-line regexp/strict
			/{(\d+)(?::(c))?}/g,
			($0, number, flag) => {
				const num = Number.parseInt(number);
				if (Number.isNaN(num)) {
					return $0;
				}
				const keyword = keywords[num] == null ? '' : toString(keywords[num]!, localeSet?.locale);
				// No translate
				if (noTranslateIndex.has(number)) {
					return keyword;
				}
				return translateKeyword(keyword, flag, localeSet);
			},
		);

		return message;
	};
}

/**
 * @experimental
 */
export function taggedTemplateTranslator(localeSet?: LocaleSet) {
	const t = translator(localeSet);
	return (strings: Readonly<TemplateStringsArray>, ...keys: readonly Primitive[]) => {
		let i = 0;
		const template = strings.raw
			.map((place, index) => {
				if (index === strings.raw.length - 1) return place;
				const value = keys[i];
				const cFlag = (typeof value === 'string' ? value : '').startsWith('c:') ? ':c' : '';
				return `${place}{${i++}${cFlag}}`;
			})
			.join('');
		return t(template, ...keys);
	};
}

function translateKeyword(keyword: string, flag: string, localeSet?: LocaleSet) {
	// No translate
	if (/^%[^%]+%$/.test(keyword)) {
		return keyword.replaceAll(/^%|%$/g, '');
	}
	// "%" prefix and suffix escaped
	keyword = keyword.replaceAll(/^%%|%%$/g, '%');
	const key = flag ? `${flag}:${keyword}` : keyword;
	const replacedWord =
		// finding with flag
		localeSet?.keywords?.[key.toLowerCase()] ||
		// finding without flag
		localeSet?.keywords?.[keyword.toLowerCase()];
	return replacedWord || keyword;
}

function toString(value: Primitive, locale = 'en') {
	switch (typeof value) {
		case 'string': {
			return value;
		}
		case 'number': {
			return toLocaleString(value, locale);
		}
		case 'boolean': {
			return `${value}`;
		}
	}
}

function toLocaleString(value: number, locale: string) {
	try {
		return value.toLocaleString(locale);
	} catch (error: unknown) {
		if (error instanceof RangeError) {
			try {
				return value.toLocaleString('en');
			} catch {
				// void
			}
		}
	}
	return value.toString(10);
}

function removeNoTranslateMark(message: string) {
	return message.replaceAll(
		// eslint-disable-next-line regexp/strict
		/(?<={\d+)\*(?=})/g,
		'',
	);
}
