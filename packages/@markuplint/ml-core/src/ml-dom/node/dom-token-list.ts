import type { MLAttr } from './attr.js';
import type { RuleInfo } from '@markuplint/ml-config';

import { getPosition } from '@markuplint/parser-utils/location';

import { UnexpectedCallError } from './unexpected-call-error.js';

type Scope = {
	raw: string;
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
			const loc = this._pick(token, offset);
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
		const r = this._pick(token);
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

	private _pick(token: string, _offset = 0): (Scope & { _searchedIndex: number }) | null {
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
			const position = getPosition(this.#origin, startOffset);
			const startLine = position.line;
			const startCol = position.column;

			return {
				raw: token,
				startOffset: (ownerAttr.valueNode?.startOffset ?? 0) + startOffset,
				startLine: (ownerAttr.valueNode?.startLine ?? 0) + (startLine - 1),
				startCol: (ownerAttr.valueNode?.startCol ?? 0) + (startCol - 1),
				rule: ownerAttr.rule,
				_searchedIndex: startOffset,
			};
		}

		return null;
	}
}
