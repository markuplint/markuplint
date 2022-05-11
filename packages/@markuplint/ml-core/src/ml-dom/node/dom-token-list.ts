import UnexpectedCallError from './unexpected-call-error';

export class MLDomTokenList extends Array<string> implements DOMTokenList {
	#set: Set<string>;

	get value() {
		return this.join(' ');
	}
	constructor(tokens: string) {
		const list = tokens
			.split(/\s+/)
			.map(t => t.trim())
			.filter(t => !!t);
		super(...list);
		this.#set = new Set(list);
	}

	add(...tokens: string[]): void {
		for (const token of tokens) {
			if (this.#set.has(token)) {
				continue;
			}
			this.#set.add(token);
			this.push(token);
		}
	}

	contains(token: string): boolean {
		return this.#set.has(token);
	}

	forEach(callbackfn: (value: string, index: number, parent: any) => void, thisArg?: any): void {
		this.forEach.bind(this)((v, i) => callbackfn(v, i, thisArg ?? this));
	}

	item(index: number): string | null {
		return this[index] ?? null;
	}

	remove(...tokens: string[]): void {
		throw new UnexpectedCallError('Not supported "remove" method');
	}

	replace(token: string, newToken: string): boolean {
		throw new UnexpectedCallError('Not supported "replace" method');
	}

	supports(token: string): boolean {
		throw new UnexpectedCallError('Not supported "supports" method');
	}

	toggle(token: string, force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "toggle" method');
	}

	toString(): string {
		return this.value;
	}
}

export function toDOMTokenList(tokens: string): DOMTokenList {
	const tokenList = new MLDomTokenList(tokens);
	return tokenList;
}
