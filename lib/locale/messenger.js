"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Messenger {
    constructor(localeSet) {
        this.localeSet = localeSet;
    }
    static async create(localeSet) {
        if (!Messenger._singleton) {
            // TODO: osLocale on browser
            Messenger._singleton = new Messenger(localeSet);
        }
        else {
            Messenger._singleton.localeSet = localeSet;
        }
        return Messenger._singleton;
    }
    message() {
        const localeSet = this.localeSet;
        return (messageTmpl, ...keywords) => {
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
Messenger._singleton = null;
exports.default = Messenger;
