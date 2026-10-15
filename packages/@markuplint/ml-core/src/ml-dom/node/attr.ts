import type { MLElement } from './element.js';
import type { AttributeNodeType } from './types.js';
import type { MLASTAttr } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { resolveNamespace } from '@markuplint/ml-spec';

import { resolveAttrNames } from '../helper/resolve-attr-names.js';
import { MLToken } from '../token/token.js';

import { MLDomTokenList } from './dom-token-list.js';
import { MLNode } from './node.js';
import { UnexpectedCallError } from '@markuplint/shared';

/**
 * Represents a DOM Attr (attribute) node wrapper in the markuplint DOM tree.
 * Wraps an AST attribute token and provides access to the attribute's name, value,
 * tokens (name, equal sign, quotes, value), and metadata such as whether
 * the attribute is a directive or has a dynamic value.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLAttr<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLNode<T, O, MLASTAttr>
	implements Attr
{
	/**
	 * A candidate attribute name suggested by the parser, if available.
	 */
	readonly candidate?: string;

	/**
	 * The end quote token of the attribute value, or null if the attribute has no value or quotes.
	 */
	readonly endQuote: MLToken | null = null;

	/**
	 * The equal sign token between the attribute name and value, or null if absent.
	 */
	readonly equal: MLToken | null = null;

	/**
	 * Whether this attribute is a directive (e.g., framework-specific attributes like `v-if` or `@click`).
	 */
	readonly isDirective?: true;

	/**
	 * Whether this attribute can be duplicated on the same element.
	 */
	readonly isDuplicatable: boolean;

	/**
	 * Whether this attribute has a dynamic value (e.g., a template expression rather than a static string).
	 */
	readonly isDynamicValue?: true;
	readonly #localName: string;

	/**
	 * The token representing the attribute name, or null for spread attributes.
	 */
	readonly nameNode: MLToken | null = null;
	readonly #namespaceURI: string | null;
	/**
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-previoussibling%E2%91%A0
	 */
	readonly ownerElement: MLElement<T, O>;
	readonly #potentialName: string;
	readonly #potentialValue: string;
	/**
	 * The whitespace token after the equal sign, or null if absent.
	 */
	readonly spacesAfterEqual: MLToken | null = null;

	/**
	 * The whitespace token before the equal sign, or null if absent.
	 */
	readonly spacesBeforeEqual: MLToken | null = null;

	/**
	 * The whitespace token before the attribute name, or null if absent.
	 */
	readonly spacesBeforeName: MLToken | null = null;

	/**
	 * The start quote token of the attribute value, or null if the attribute has no value or quotes.
	 */
	readonly startQuote: MLToken | null = null;

	/**
	 * The token representing the attribute value, or null if the attribute has no value.
	 */
	readonly valueNode: MLToken | null = null;

	/**
	 * Returns the "string" if HTML syntax. Otherwise, returns a type in its syntax.
	 *
	 * @default "string"
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	readonly valueType: 'string' | 'number' | 'boolean' | 'code' = 'string';

	/**
	 * Creates a new MLAttr instance from an AST attribute token.
	 *
	 * @param astToken - The AST attribute token to wrap
	 * @param ownElement - The element that owns this attribute
	 */
	constructor(
		astToken: MLASTAttr,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		ownElement: MLElement<T, O>,
	) {
		super(astToken, ownElement.ownerMLDocument);

		this.ownerElement = ownElement;

		if (this._astToken.type === 'spread') {
			this.#namespaceURI = null;
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
		this.#potentialValue = this._astToken.potentialValue ?? this.valueNode?.raw ?? '';

		const resolved = resolveAttrNames(this._astToken, ownElement.ownerMLDocument.specs);
		this.#potentialName = resolved.potentialName;
		this.candidate = resolved.candidate;
		this.isDynamicValue = resolved.isDynamicValue;
		this.isDirective = resolved.isDirective;
		this.isDuplicatable = resolved.isDuplicatable;
		if (resolved.valueType) {
			this.valueType = resolved.valueType;
		}

		const ns = resolveNamespace(this.#potentialName, ownElement.namespaceURI);
		this.#localName = ns.localName;
		// An attribute does not inherit the namespace of its element, so only a known prefix
		// gives it one. `ns.namespace` equals the prefix exactly when the prefix is a known
		// one; for an unknown prefix it falls back to the element's namespace.
		const hasPrefix = ns.localName !== this.#potentialName;
		const prefix = this.#potentialName.split(':')[0];
		this.#namespaceURI = hasPrefix && ns.namespace === prefix ? ns.namespaceURI : null;
	}

	/**
	 * Returns the local name portion of the attribute (without namespace prefix).
	 *
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-attr-localname
	 */
	get localName(): string {
		return this.#localName;
	}

	/**
	 * Returns the qualified attribute name (the potential name resolved by the parser).
	 *
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-attr-name
	 */
	get name(): string {
		return this.#potentialName;
	}

	/**
	 * Returns the namespace URI of this attribute: that of its prefix when the name has a known
	 * one (e.g. `xlink:href`), otherwise `null`. An attribute without a prefix has no namespace
	 * whichever element it is on, and so does a spread attribute.
	 *
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

	/**
	 * Returns the attribute value, equivalent to the `value` property.
	 *
	 * @implements DOM API: `Attr`
	 * @see https://dom.spec.whatwg.org/#dom-node-nodevalue
	 */
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
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string {
		return this.value;
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
	 * Returns a normalized string representation of the attribute,
	 * stripping extraneous whitespace around the name, equal sign, and value tokens.
	 * Falls back to the raw string if any token is missing.
	 *
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 * @returns The normalized attribute string
	 */
	toNormalizeString() {
		if (this.nameNode && this.equal && this.startQuote && this.valueNode && this.endQuote) {
			return this.nameNode.raw + this.equal.raw + this.startQuote.raw + this.valueNode.raw + this.endQuote.raw;
		}
		return this.raw;
	}

	/**
	 * Returns the raw string representation of the attribute.
	 *
	 * @implements DOM API: `Attr`
	 * @returns The string representation of the attribute.
	 */
	toString() {
		return this.raw;
	}
}
