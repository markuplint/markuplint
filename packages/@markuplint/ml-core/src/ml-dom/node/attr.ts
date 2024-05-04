import type { MLElement } from './element.js';
import type { AttributeNodeType } from './types.js';
import type { MLASTAttr } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { resolveNamespace } from '@markuplint/ml-spec';

import { MLToken } from '../token/token.js';

import { MLDomTokenList } from './dom-token-list.js';
import { MLNode } from './node.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

export class MLAttr<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLNode<T, O, MLASTAttr>
	implements Attr
{
	readonly candidate?: string;
	readonly endQuote: MLToken | null = null;
	readonly equal: MLToken | null = null;
	readonly isDirective?: true;
	readonly isDuplicatable: boolean;
	readonly isDynamicValue?: true;
	readonly #localName: string;
	readonly nameNode: MLToken | null = null;
	readonly #namespaceURI: string;
	/**
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-previoussibling%E2%91%A0
	 */
	readonly ownerElement: MLElement<T, O>;
	readonly #potentialName: string;
	readonly #potentialValue: string;
	readonly spacesAfterEqual: MLToken | null = null;
	readonly spacesBeforeEqual: MLToken | null = null;
	readonly spacesBeforeName: MLToken | null = null;
	readonly startQuote: MLToken | null = null;
	readonly valueNode: MLToken | null = null;

	/**
	 * Returns the "string" if HTML syntax. Otherwise, returns a type in its syntax.
	 *
	 * @default "string"
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	readonly valueType: 'string' | 'number' | 'boolean' | 'code' = 'string';

	constructor(
		astToken: MLASTAttr,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		ownElement: MLElement<T, O>,
	) {
		super(astToken, ownElement.ownerMLDocument);

		this.ownerElement = ownElement;

		if (this._astToken.type === 'spread') {
			this.#namespaceURI = ownElement.namespaceURI;
			this.valueType = 'code';
			this.#localName = '#spread';
			this.#potentialName = '#spread';
			this.#potentialValue = this._astToken.raw;
			this.isDirective = true;
			this.isDynamicValue = true;
			this.isDuplicatable = true;
			return;
		}

		this.spacesBeforeName = new MLToken(this._astToken.spacesBeforeName);
		this.nameNode = new MLToken(this._astToken.name);
		this.spacesBeforeEqual = new MLToken(this._astToken.spacesBeforeEqual);
		this.equal = new MLToken(this._astToken.equal);
		this.spacesAfterEqual = new MLToken(this._astToken.spacesAfterEqual);
		this.startQuote = new MLToken(this._astToken.startQuote);
		this.valueNode = new MLToken(this._astToken.value);
		this.endQuote = new MLToken(this._astToken.endQuote);
		this.isDynamicValue = this._astToken.isDynamicValue;
		this.isDirective = this._astToken.isDirective;
		this.candidate = this._astToken.candidate;
		this.#potentialName = this._astToken.potentialName ?? this.nameNode?.raw ?? '';
		this.#potentialValue = this._astToken.potentialValue ?? this.valueNode?.raw ?? '';
		this.isDuplicatable = this._astToken.isDuplicatable;

		const ns = resolveNamespace(this.#potentialName, ownElement.namespaceURI);
		this.#localName = ns.localName;
		this.#namespaceURI = ns.namespaceURI;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-attr-localname
	 */
	get localName(): string {
		return this.#localName;
	}

	/**
	 *
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-attr-name
	 */
	get name(): string {
		return this.#potentialName;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-attr-namespaceuri
	 */
	get namespaceURI(): string | null {
		return this.#namespaceURI;
	}

	/**
	 * Returns a string appropriate for the type of node as `Attr`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-attr%E2%91%A4
	 */
	get nodeName(): string {
		return this.name;
	}

	/**
	 * Returns a number appropriate for the type of `Attr`
	 */
	get nodeType(): AttributeNodeType {
		return this.ATTRIBUTE_NODE;
	}

	get nodeValue() {
		return this.value;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-attr-prefix
	 */
	get prefix(): string | null {
		throw new UnexpectedCallError('Not supported "prefix" property');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	get rule() {
		return this.ownerElement.rule;
	}

	/**
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-attr-specified
	 */
	get specified(): true {
		return true;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	get tokenList(): MLDomTokenList | null {
		return this.isDynamicValue ? null : new MLDomTokenList(this.value, [this]);
	}

	/**
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-attr-value
	 */
	get value(): string {
		return this.#potentialValue;
	}

	/**
	 * Fixes the attribute value.
	 * If the attribute is not a spread attribute, it calls the `fix` method of the `valueNode`.
	 *
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 *
	 * @param raw - The raw attribute value.
	 */
	fix(raw: string) {
		if (this.localName === '#spread') {
			return;
		}

		// `valueNode` is not null when it is no spread.
		this.valueNode?.fix(raw);
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	toNormalizeString() {
		if (this.nameNode && this.equal && this.startQuote && this.valueNode && this.endQuote) {
			return this.nameNode.raw + this.equal.raw + this.startQuote.raw + this.valueNode.raw + this.endQuote.raw;
		}
		return this.raw;
	}

	/**
	 * Returns a string representation of the attribute.
	 *
	 * @implements DOM API: `Attr`
	 *
	 * @param includesSpacesBeforeName - Whether to include spaces before the attribute name.
	 * @returns The string representation of the attribute.
	 */
	toString(fixed = false) {
		if (!fixed) {
			return this.raw;
		}

		if (this.localName === '#spread') {
			return this.raw;
		}

		const tokens = [this.nameNode?.toString(true) ?? ''];
		if (this.equal && this.equal.toString(true) !== '') {
			tokens.push(
				this.spacesBeforeEqual?.toString(true) ?? '',
				this.equal?.toString(true) ?? '',
				this.spacesAfterEqual?.toString(true) ?? '',
				this.startQuote?.toString(true) ?? '',
				this.valueNode?.toString(true) ?? '',
				this.endQuote?.toString(true) ?? '',
			);
		} else if (this.valueNode && this.valueNode.toString(true) !== '') {
			tokens.push(
				//
				'=',
				this.startQuote?.toString(true) || '"',
				this.valueNode.toString(true),
				this.endQuote?.toString(true) || '"',
			);
		}

		return tokens.join('');
	}
}
