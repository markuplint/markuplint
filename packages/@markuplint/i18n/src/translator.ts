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
			return `${format.quoteStart}${messageTmpl.join(
				`${format.quoteEnd}${format.separator}${format.quoteStart}`,
			)}${format.quoteEnd}`;
		}

		if (keywords.length === 0) {
			const keyword = localeSet?.keywords?.[messageTmpl];
			return keyword || messageTmpl;
		}

		const sentence = localeSet?.sentences?.[messageTmpl];
		if (sentence) {
			messageTmpl = sentence;
		}

		message = messageTmpl.replace(/\{([0-9]+)(?::([c]))?\}/g, ($0, number, flag) => {
			const num = parseInt(number);
			if (isNaN(num)) {
				return $0;
			}
			const keyword = keywords[num] != null ? toString(keywords[num], localeSet?.locale) : '';
			const key = flag ? `${flag}:${keyword}` : keyword;
			const replacedWord =
				// finding with flag
				localeSet?.keywords?.[key.toLowerCase()] ||
				// finding without flag
				localeSet?.keywords?.[keyword.toLowerCase()];
			return replacedWord || keyword;
		});

		return message;
	};
}

function toString(value: Primitive, locale = 'en') {
	switch (typeof value) {
		case 'string':
			return value;
		case 'number':
			return value.toLocaleString(locale);
		case 'boolean':
			return `${value}`;
	}
}
