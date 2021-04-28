export type Primitive = string | number | boolean;

export type Translator = (messageTmpl: string, ...keywords: Primitive[]) => string;

export interface LocaleSet {
	keywords: LocalesKeywords;
	[messageId: string]: string | void | LocalesKeywords;
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
		const localeSet = this.localeSet;
		return (messageTmpl: string, ...keywords: Primitive[]) => {
			let message = messageTmpl;
			if (localeSet) {
				const t = localeSet[messageTmpl];
				if (typeof t === 'string') {
					messageTmpl = t;
				}
			}

			message = messageTmpl.replace(/\{([0-9]+)\}/g, ($0, $1) => {
				const keyword = `${keywords[+$1]}` || '';
				if (localeSet) {
					return localeSet.keywords[keyword.toLowerCase()] || keyword;
				}
				return keyword;
			});
			return message;
		};
	}
}
