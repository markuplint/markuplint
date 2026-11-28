import type { MLAttr } from './attr.js';
import type { RuleInfo } from '@markuplint/ml-config';

import { getPosition } from '@markuplint/parser-utils/location';

import { splitOnAsciiWhitespace, UnexpectedCallError } from '@markuplint/shared';

type Scope = {
	/** The token as it is written in the source */
	raw: string;
	/** The token: the value of the attribute is decoded, so it may differ from `raw` */
	value: string;
	startOffset: number;
	startLine: number;
	startCol: number;
	rule: RuleInfo<any, any>;
};

export class MLDomTokenList extends Array<string> implements DOMTokenList {
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
		const list = splitOnAsciiWhitespace(tokens);
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
			// A token that is not located keeps the offset, so a later repeat is not taken for an earlier one
			if (!loc) {
				continue;
			}
			offset = loc._searchedIndex;
			locs.push({
				raw: loc.raw,
				value: loc.value,
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
			value: r.value,
			startOffset: r.startOffset,
			startLine: r.startLine,
			startCol: r.startCol,
			rule: r.rule,
		};
	}

	remove(...tokens: readonly string[]): void {
		throw new UnexpectedCallError('Not supported "remove" method');
	}

	replace(token: string, newToken: string): boolean {
		throw new UnexpectedCallError('Not supported "replace" method');
	}

	supports(token: string): boolean {
		throw new UnexpectedCallError('Not supported "supports" method');
	}

	toString(): string {
		return this.value;
	}

	toggle(token: string, force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "toggle" method');
	}

	#pick(token: string, _offset = 0): (Scope & { _searchedIndex: number }) | null {
		token = splitOnAsciiWhitespace(token)[0] ?? '';
		if (!token) {
			return null;
		}

		// The token as a whole token of the list, not a part of another (`a` in `ab`), from where the previous one ends;
		// one in an attribute whose value is not known is passed over
		let startOffset = indexOfToken(this.#origin, token, _offset);
		while (startOffset !== -1 && this.#isInDynamicAttr(startOffset)) {
			startOffset = indexOfToken(this.#origin, token, startOffset + token.length);
		}
		if (startOffset === -1) {
			return null;
		}
		const searchedIndex = startOffset + token.length;

		// The list of several attributes (`class` and `:class`) joins their values with a space: the token is in the
		// attribute whose part of the list holds it
		let attrStart = 0;
		for (const ownerAttr of this.#ownerAttrs) {
			const own = ownerAttr.value;
			const attrEnd = attrStart + own.length;
			const isInThis = startOffset >= attrStart && searchedIndex <= attrEnd;
			const local = startOffset - attrStart;
			attrStart = attrEnd + 1;
			if (!isInThis || ownerAttr.isDynamicValue) {
				continue;
			}

			// A value written in the markup is the source with its character references decoded: the attribute knows
			// where each of its characters is written
			if (!ownerAttr.isExpressionValue) {
				const located = ownerAttr.locateInValue(local, local + token.length);
				if (located) {
					return { ...located, value: token, rule: ownerAttr.rule, _searchedIndex: searchedIndex };
				}
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
					raw.slice(1, -1) === own;
				if (!isPlainString) {
					return {
						raw: token,
						value: token,
						startOffset: ownerAttr.valueNode.startOffset,
						startLine: ownerAttr.valueNode.startLine,
						startCol: ownerAttr.valueNode.startCol,
						rule: ownerAttr.rule,
						_searchedIndex: searchedIndex,
					};
				}
				shift = 1;
			}

			const position = getPosition(own, local);
			const startLine = position.line;
			const startCol = position.column;

			return {
				raw: token,
				value: token,
				startOffset: (base?.startOffset ?? 0) + shift + local,
				startLine: (base?.startLine ?? 0) + (startLine - 1),
				// What starts the value (the quote) is before a token on the first line only: the column on a later line is the column in the line
				startCol: startLine > 1 ? startCol : (base?.startCol ?? 0) + shift + (startCol - 1),
				rule: ownerAttr.rule,
				_searchedIndex: searchedIndex,
			};
		}

		return null;
	}

	/**
	 * @param offset - An offset in the joined list
	 * @returns Whether it is in the part of an attribute whose value is not known
	 */
	#isInDynamicAttr(offset: number): boolean {
		let attrStart = 0;
		for (const ownerAttr of this.#ownerAttrs) {
			const attrEnd = attrStart + ownerAttr.value.length;
			if (offset >= attrStart && offset < attrEnd) {
				return !!ownerAttr.isDynamicValue;
			}
			attrStart = attrEnd + 1;
		}
		return false;
	}
}

/**
 * @param list - A list of tokens separated by ASCII white space
 * @param token - A token
 * @param from - Where to start looking
 * @returns Where the token is as a whole token of the list, or -1
 */
function indexOfToken(list: string, token: string, from: number): number {
	let index = list.indexOf(token, from);
	while (index !== -1) {
		const before = list[index - 1];
		const after = list[index + token.length];
		if ((before === undefined || isAsciiWhitespace(before)) && (after === undefined || isAsciiWhitespace(after))) {
			return index;
		}
		index = list.indexOf(token, index + 1);
	}
	return -1;
}

function isAsciiWhitespace(char: string): boolean {
	return char === ' ' || char === '\t' || char === '\n' || char === '\f' || char === '\r';
}
