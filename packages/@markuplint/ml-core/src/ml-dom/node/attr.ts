import type { MLElement } from './element';
import type { AttributeNodeType } from './types';
import type { MLASTAttr } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { MLToken } from '../token/token';

import { MLDomTokenList } from './dom-token-list';
import { MLNode } from './node';
import UnexpectedCallError from './unexpected-call-error';

export class MLAttr<T extends RuleConfigValue, O = null> extends MLNode<T, O, MLASTAttr> implements Attr {
	readonly #potentialName: string;
	readonly #potentialValue: string;
	readonly candidate?: string;
	readonly endQuote: MLToken | null = null;
	readonly equal: MLToken | null = null;
	readonly isDirective?: true;
	readonly isDuplicatable: boolean;
	readonly isDynamicValue?: true;
	readonly nameNode: MLToken | null = null;

	/**
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-previoussibling%E2%91%A0
	 */
	readonly ownerElement: MLElement<T, O>;
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

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-attr-localname
	 */
	get localName(): string {
		throw new UnexpectedCallError('Not supported "localname" property');
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
		throw new UnexpectedCallError('Not supported "namespaceURI" property');
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
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-attr-value
	 */
	get value(): string {
		return this.#potentialValue;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	get tokenList(): MLDomTokenList | null {
		return this.isDynamicValue ? null : new MLDomTokenList(this.value, [this]);
	}

	constructor(astToken: MLASTAttr, ownElement: MLElement<T, O>) {
		super(astToken, ownElement.ownerMLDocument);

		if (this._astToken.type === 'html-attr') {
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
			this.#potentialName = this._astToken.potentialName || this.nameNode?.raw || '';
			this.#potentialValue = this._astToken.value.raw || '';
		} else {
			this.valueType = this._astToken.valueType;
			this.isDuplicatable = this._astToken.isDuplicatable;
			this.#potentialName = this._astToken.potentialName;
			this.#potentialValue = this._astToken.potentialValue;
		}

		this.ownerElement = ownElement;
		this.isDuplicatable = this._astToken.isDuplicatable;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	toNormalizeString() {
		if (this.nameNode && this.equal && this.startQuote && this.valueNode && this.endQuote) {
			return (
				this.nameNode.originRaw +
				this.equal.originRaw +
				this.startQuote.originRaw +
				this.valueNode.originRaw +
				this.endQuote.originRaw
			);
		}
		return this.raw;
	}
}
