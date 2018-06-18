export declare type Primitive = string | number | boolean;
export declare type Message = (messageTmpl: string, ...keywords: Primitive[]) => string;
export interface LocaleSet {
    locale: string;
    keywords: LocalesKeywords;
    [messageId: string]: string | void | LocalesKeywords;
}
export interface LocalesKeywords {
    [messageId: string]: string | void;
}
export default class Messenger {
    private static _singleton;
    static create(localeSet: LocaleSet | null): Promise<Messenger>;
    localeSet: LocaleSet | null;
    private constructor();
    message(): Message;
}
//# sourceMappingURL=index.d.ts.map