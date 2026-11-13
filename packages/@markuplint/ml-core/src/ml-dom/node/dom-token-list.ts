import type { MLAttr } from './attr.js';
import type { RuleInfo } from '@markuplint/ml-config';

import { getPosition } from '@markuplint/parser-utils/location';

type Scope = {
	raw: string;
	startOffset: number;
	startLine: number;
	startCol: number;
	rule: RuleInfo<any, any>;
};

export class MLDomTokenList extends Array<string> {
	#origin: string;
	/**
	 * In some cases, an author specifies multiple attributes or directives.
	 * The reference is not always one.
	 */
	#ownerAttrs: MLAttr<any, any>[];
	#set: Set<string>;

	constructor(
		tokens: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		ownerAttrs: MLAttr<any, any>[],
	) {
		const list = tokens
			.split(/\s+/)
			.map(t => t.trim())
			.filter(t => !!t);
		super(...list);
		this.#origin = tokens;
		this.#ownerAttrs = ownerAttrs;
		this.#set = new Set(list);
	}

	get value() {
		return this.join(' ');
	}

	add(...tokens: readonly string[]): void {
		for (const token of tokens) {
			if (this.#set.has(token)) {
				continue;
			}
			this.#set.add(token);
			this.push(token);
		}
		this.#origin += tokens.join(' ');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDomTokenList`
	 */
	allTokens() {
		let offset = 0;
		const tokens = [...this];
		const locs: Scope[] = [];
		while (tokens.length > 0) {
			const token = tokens.shift();
			if (!token) {
				break;
			}
			const loc = this.#pick(token, offset);
			if (!loc) {
				offset = 0;
				continue;
			}
			offset = loc._searchedIndex;
			locs.push({
				raw: loc.raw,
				startOffset: loc.startOffset,
				startLine: loc.startLine,
				startCol: loc.startCol,
				rule: loc.rule,
			});
		}
		return locs;
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

	/**
	 * @implements `@markuplint/ml-core` API: `MLDomTokenList`
	 */
	pick(token: string): Scope | null {
		const r = this.#pick(token);
		if (!r) {
			return null;
		}
		return {
			raw: r.raw,
			startOffset: r.startOffset,
			startLine: r.startLine,
			startCol: r.startCol,
			rule: r.rule,
		};
	}

	toString(): string {
		return this.value;
	}

	#pick(token: string, _offset = 0): (Scope & { _searchedIndex: number }) | null {
		token = token.trim().split(/\s+/)[0] ?? '';
		if (!token) {
			return null;
		}

		for (const ownerAttr of this.#ownerAttrs) {
			if (ownerAttr.isDynamicValue) {
				continue;
			}
			const startOffset = this.#origin.indexOf(token, _offset);
			if (startOffset === -1) {
				continue;
			}

			// The value is what code results in (`{"a b"}`), not the text of the source: an offset in it is the offset in
			// the source only for a string of the same characters in quotes, where the quote is one character before the
			// value. For an escape, a wrapper or another notation, the token is reported at the start of the value.
			const base = ownerAttr.valueNode;
			let shift = 0;
			if (ownerAttr.isExpressionValue && ownerAttr.valueNode) {
				const raw = ownerAttr.valueNode.raw;
				const quote = raw[0];
				const isPlainString =
					raw.length >= 2 &&
					(quote === '"' || quote === "'" || quote === '`') &&
					raw.endsWith(quote) &&
					raw.slice(1, -1) === this.#origin;
				if (!isPlainString) {
					return {
						raw: token,
						startOffset: ownerAttr.valueNode.startOffset,
						startLine: ownerAttr.valueNode.startLine,
						startCol: ownerAttr.valueNode.startCol,
						rule: ownerAttr.rule,
						_searchedIndex: startOffset,
					};
				}
				shift = 1;
			}

			const position = getPosition(this.#origin, startOffset);
			const startLine = position.line;
			const startCol = position.column;

			return {
				raw: token,
				startOffset: (base?.startOffset ?? 0) + shift + startOffset,
				startLine: (base?.startLine ?? 0) + (startLine - 1),
				// What starts the value (the quote) is before a token on the first line only: the column on a later line is the column in the line
				startCol: startLine > 1 ? startCol : (base?.startCol ?? 0) + shift + (startCol - 1),
				rule: ownerAttr.rule,
				_searchedIndex: startOffset,
			};
		}

		return null;
	}
}
