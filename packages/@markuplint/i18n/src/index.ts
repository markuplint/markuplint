export type Primitive = string | number | boolean;

export type Translator = (messageTmpl: string, ...keywords: Primitive[]) => string;

export interface LocaleSet {
	keywords?: LocalesKeywords;
	sentences?: LocalesKeywords;
}

export interface LocalesKeywords {
	[messageId: string]: string | void;
}

export class I18n {
	private static _singleton: I18n | null = null;

	static create(localeSet: LocaleSet | null) {
		if (!I18n._singleton) {
			I18n._singleton = new I18n(localeSet);
		} else {
			I18n._singleton.localeSet = localeSet;
		}
		return I18n._singleton;
	}

	localeSet: LocaleSet | null;

	private constructor(localeSet: LocaleSet | null) {
		this.localeSet = localeSet;
	}

	translator(): Translator {
		return (messageTmpl: string, ...keywords: Primitive[]) => {
			let message = messageTmpl;
			if (!this.localeSet) {
				return message;
			}

			const localeSet = this.localeSet;
			const t = localeSet.sentences?.[messageTmpl];
			if (typeof t === 'string') {
				messageTmpl = t;
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
					localeSet.keywords?.[key.toLowerCase()] ||
					// finding without flag
					localeSet.keywords?.[keyword.toLowerCase()];
				return replacedWord || keyword;
			});

			return message;
		};
	}
}
