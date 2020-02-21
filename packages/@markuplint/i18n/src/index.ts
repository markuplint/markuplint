export type Primitive = string | number | boolean;

export type Message = (messageTmpl: string, ...keywords: Primitive[]) => string;

export interface LocaleSet {
	keywords: LocalesKeywords;
	[messageId: string]: string | void | LocalesKeywords;
}

export interface LocalesKeywords {
	[messageId: string]: string | void;
}

export class Messenger {
	private static _singleton: Messenger | null = null;

	static async create(localeSet: LocaleSet | null) {
		if (!Messenger._singleton) {
			Messenger._singleton = new Messenger(localeSet);
		} else {
			Messenger._singleton.localeSet = localeSet;
		}
		return Messenger._singleton;
	}

	localeSet: LocaleSet | null;

	private constructor(localeSet: LocaleSet | null) {
		this.localeSet = localeSet;
	}

	message(): Message {
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
