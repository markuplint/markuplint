declare module 'whatwg-mimetype' {
	class MIMETypeParameters {
		get size(): number;
		has(name: string): boolean;
		get(name: string): string | undefined;
		set(name: string, value: string): void;
		delete(name: string): void;
		keys(): IterableIterator<string>;
		values(): IterableIterator<string>;
		entries(): IterableIterator<[string, string]>;
		[Symbol.iterator](): IterableIterator<[string, string]>;
	}

	export class MIMEType {
		constructor(input: string);
		static parse(input: string): MIMEType | null;
		get type(): string;
		set type(value: string);
		get subtype(): string;
		set subtype(value: string);
		get essence(): string;
		get parameters(): MIMETypeParameters;
		toString(): string;
		isJavaScript(options?: { readonly prohibitParameters?: boolean }): boolean;
		isXML(): boolean;
		isHTML(): boolean;
	}
}
