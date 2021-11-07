export type Primitive = string | number | boolean;

export type Translator = (messageTmpl: string, ...keywords: Primitive[]) => string;

export interface LocaleSet {
	locale: string;
	keywords?: LocalesKeywords;
	sentences?: LocalesKeywords;
}

export interface LocalesKeywords {
	[messageId: string]: string | void;
}

export function translator(localeSet?: LocaleSet): Translator {
	return (messageTmpl: string, ...keywords: Primitive[]) => {
		let message = messageTmpl;

		const sentence = localeSet?.sentences?.[messageTmpl];
		if (sentence) {
			messageTmpl = sentence;
		}

		message = messageTmpl.replace(/\{([0-9]+)(?::([c]))?\}/g, ($0, number, flag) => {
			const num = parseInt(number);
			if (isNaN(num)) {
				return $0;
			}
			const keyword = keywords[num] != null ? `${keywords[num]}` : '';
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
