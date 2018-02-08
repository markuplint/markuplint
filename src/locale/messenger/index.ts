export type Message = (messageTmpl: string, ...keywords: string[]) => string;

export interface LocaleSet {
	locale: string;
	keywords: LocalesKeywords;
	[messageId: string]: string | void | LocalesKeywords;
}

export interface LocalesKeywords {
	[messageId: string]: string | void;
}

export default class Messenger {
	private static _singleton: Messenger | null = null;

	public static async create (localeSet: LocaleSet | null) {
		if (!Messenger._singleton) {
			Messenger._singleton = new Messenger(localeSet);
		} else {
			Messenger._singleton.localeSet = localeSet;
		}
		return Messenger._singleton;
	}

	public localeSet: LocaleSet | null;

	private constructor (localeSet: LocaleSet | null) {
		this.localeSet = localeSet;
	}

	public message (): Message {
		const localeSet = this.localeSet;
		return (messageTmpl: string, ...keywords: string[]) => {
			let message = messageTmpl;
			if (localeSet) {
				const t = localeSet[messageTmpl];
				if (typeof t === 'string') {
					messageTmpl = t;
				}
			}

			message = messageTmpl.replace(/\{([0-9]+)\}/g, ($0, $1) => {
				const keyword = keywords[+$1] || '';
				if (localeSet) {
					return localeSet.keywords[keyword.toLowerCase()] || keyword;
				}
				return keyword;
			});
			return message;
		};

	}
}
