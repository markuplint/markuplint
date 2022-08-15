import type { ListFormat, LocaleSet, Primitive, Translator } from './types';

const defaultListFormat: ListFormat = {
	quoteStart: '"',
	quoteEnd: '"',
	separator: ', ',
};

export function translator(localeSet?: LocaleSet): Translator {
	return (messageTmpl: string | string[], ...keywords: Primitive[]) => {
		let message = messageTmpl;

		if (Array.isArray(messageTmpl)) {
			const format = localeSet?.listFormat || defaultListFormat;
			return `${format.quoteStart}${messageTmpl
				.map(keyword => translateKeyword(keyword, '', localeSet))
				.join(`${format.quoteEnd}${format.separator}${format.quoteStart}`)}${format.quoteEnd}`;
		}

		if (keywords.length === 0) {
			return translateKeyword(messageTmpl, '', localeSet);
		}

		const noTranslateIndex = Array.from(messageTmpl.matchAll(/(?<=\{)[0-9]+(?=\*\})/g)).map(m => m[0]);
		const key = messageTmpl.replace(/(?<=\{[0-9]+)\*(?=\})/g, '');

		const sentence = localeSet?.sentences?.[key];
		messageTmpl = sentence ?? key;

		message = messageTmpl.replace(/\{([0-9]+)(?::([c]))?\}/g, ($0, number, flag) => {
			const num = parseInt(number);
			if (isNaN(num)) {
				return $0;
			}
			const keyword = keywords[num] != null ? toString(keywords[num], localeSet?.locale) : '';
			// No translate
			if (noTranslateIndex.includes(number)) {
				return keyword;
			}
			return translateKeyword(keyword, flag, localeSet);
		});

		return message;
	};
}

/**
 * @experimental
 */
export function taggedTemplateTranslator(localeSet?: LocaleSet) {
	const t = translator(localeSet);
	return (strings: TemplateStringsArray, ...keys: Primitive[]) => {
		let i = 0;
		const template = strings.raw
			.map((place, index) => {
				if (index === strings.raw.length - 1) return place;
				const value = keys[i];
				const cFlag = /^c:/.test(typeof value === 'string' ? value : '') ? ':c' : '';
				return `${place}{${i++}${cFlag}}`;
			})
			.join('');
		return t(template, ...keys);
	};
}

function translateKeyword(keyword: string, flag: string, localeSet?: LocaleSet) {
	// No translate
	if (/^%[^%]+%$/.test(keyword)) {
		return keyword.replace(/^%|%$/g, '');
	}
	// "%" prefix and suffix escaped
	keyword = keyword.replace(/^%%|%%$/g, '%');
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
		case 'string':
			return value;
		case 'number':
			return toLocaleString(value, locale);
		case 'boolean':
			return `${value}`;
	}
}

function toLocaleString(value: number, locale: string) {
	try {
		return value.toLocaleString(locale);
	} catch (e: unknown) {
		if (e instanceof RangeError) {
			try {
				return value.toLocaleString('en');
			} catch (_) {
				// void
			}
		}
	}
	return value.toString(10);
}
