import type { MLElement } from './element.js';
import type { AttributeNodeType } from './types.js';
import type { MLASTAttr } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { resolveNamespace, compileDirectivePatterns, resolveDirective } from '@markuplint/ml-spec';
import { searchIDLAttribute, suggestIDLAttribute } from '@markuplint/parser-utils';

import { adjustForeignAttrName } from '../helper/foreign-attr-names.js';
import { MLToken } from '../token/token.js';

import { MLDomTokenList } from './dom-token-list.js';
import { MLNode } from './node.js';
import { UnexpectedCallError, asciiLowerCase, camelize } from '@markuplint/shared';

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
		this.candidate = this._astToken.candidate;
		this.#potentialValue = this._astToken.potentialValue ?? this.valueNode?.raw ?? '';

		if (this._astToken.potentialName == null) {
			// Try declarative directive pattern resolution from spec
			const patterns = ownElement.ownerMLDocument.specs.directivePatterns ?? [];
			const resolution =
				patterns.length > 0
					? resolveDirective(this.nameNode?.raw ?? '', compileDirectivePatterns(patterns))
					: null;

			if (resolution) {
				this.#potentialName = resolution.potentialName ?? this.nameNode?.raw ?? '';
				this.isDynamicValue = resolution.isDynamicValue;
				this.isDirective = resolution.isDirective;
				this.isDuplicatable = resolution.isDuplicatable ?? this._astToken.isDuplicatable;
				if (resolution.valueType) {
					this.valueType = resolution.valueType;
				}
			} else {
				this.#potentialName = this.nameNode?.raw ?? '';
				this.isDynamicValue = this._astToken.isDynamicValue;
				this.isDirective = this._astToken.isDirective;
				this.isDuplicatable = this._astToken.isDuplicatable;
			}

			// IDL attribute resolution (after directivePatterns).
			// Performed in the core, not in each parser: any spec opting in via
			// `acceptedAttrNames` shares the same IDL-to-content-attribute mapping.
			if (ownElement.ownerMLDocument.specs.acceptedAttrNames && !this.isDirective) {
				const { contentAttrName, idlPropName } = searchIDLAttribute(this.#potentialName);
				if (contentAttrName && contentAttrName !== this.#potentialName) {
					this.#potentialName = contentAttrName;
				}
				// Set candidate for IDL naming suggestions (e.g., tabindex → tabIndex in JSX).
				// Only in 'idl' mode (React). In 'both' mode (Svelte), both content and IDL names are accepted.
				if (!resolution && ownElement.ownerMLDocument.specs.acceptedAttrNames === 'idl') {
					// The property of a spelling that is not its own (`TABINDEX`) is suggested as well
					const suggested = idlPropName ?? suggestIDLAttribute(this.#potentialName);
					const rawName = this.nameNode?.raw ?? '';
					if (suggested && rawName !== suggested) {
						this.candidate = suggested;
					}
				}
			}
		} else {
			// Parser-set potentialName takes precedence
			this.#potentialName = this._astToken.potentialName;
			this.isDynamicValue = this._astToken.isDynamicValue;
			this.isDirective = this._astToken.isDirective;
			this.isDuplicatable = this._astToken.isDuplicatable;
		}

		// The HTML parser lower-cases the name before it adjusts a foreign attribute, so `XLINK:HREF`
		// is `xlink:href` there; a name that code sets keeps the case of its prefix.
		const prefixed = this.#potentialName.includes(':') && !this.isSetThroughDOMAPI;
		const nameWithPrefix = prefixed ? asciiLowerCase(this.#potentialName) : this.#potentialName;
		const ns = resolveNamespace(nameWithPrefix, ownElement.namespaceURI);
		this.#localName = ns.localName;
		// An attribute does not inherit the namespace of its element, so only a known prefix
		// gives it one. `ns.namespace` equals the prefix exactly when the prefix is a known
		// one; for an unknown prefix it falls back to the element's namespace.
		const hasPrefix = ns.localName !== nameWithPrefix;
		const prefix = nameWithPrefix.split(':')[0];
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
	 * The name that the DOM gives this attribute, which two spellings of a name share when they are
	 * one attribute (`ID` and `id` on a `<div>`, `VIEWBOX` and `viewbox` on an `<svg>` that the
	 * HTML parser reads). `name` keeps the spelling of the source for a message, and for
	 * `case-sensitive-attr-name`.
	 *
	 * It depends on how the name gets into the DOM (`MLDocument#attrNameRoute`) and on the element:
	 * the HTML parser lower-cases a name, and restores the case of the names of SVG and MathML;
	 * `setAttribute` lower-cases a name only on an element of the HTML namespace, so `ROLE` on an
	 * `<svg>` that code sets is `ROLE`, which is not `role`. The attribute of a component is a prop,
	 * which keeps its spelling, except in Vue where `my-label` and `myLabel` are one prop.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-element-setattribute
	 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
	 */
	get nameKey(): string {
		return this.keyOf(this.#potentialName);
	}

	/**
	 * The key of `name`, a name of a spec, of an option or of a lookup, as this attribute is keyed:
	 * `name` is this attribute when its key is {@link MLAttr.nameKey}. Only the ASCII letters fold,
	 * as the HTML syntax says (`toLowerCase` also turns U+212A KELVIN SIGN into `k`).
	 *
	 * It is read when asked, not kept: the namespace of the element can change while a pretender
	 * is resolved.
	 *
	 * @param name - A name as written
	 */
	keyOf(name: string): string {
		const el = this.ownerElement;
		if (el.elementType === 'authored') {
			return el.ownerMLDocument.componentNameVariants ? camelize(name) : name;
		}
		if (!el.isForeignElement) {
			return asciiLowerCase(name);
		}
		if (this.isSetThroughDOMAPI) {
			return name;
		}
		return adjustForeignAttrName(asciiLowerCase(name), el.namespaceURI);
	}

	/**
	 * Whether `name` is the name of this attribute: the spelling it is written in, or another that
	 * the DOM makes the same attribute ({@link MLAttr.keyOf}). A spec, an option and the lookups of
	 * the element ask this, so the case of a name is decided here and not in each of them.
	 *
	 * A name with a capital letter that code sets on an element of the HTML namespace is a prop of
	 * the framework (`defaultValue` of React), not an attribute of the DOM: only its exact spelling
	 * is it, and `defaultvalue` is not (see {@link MLAttr.isPrefixedBy} for a prefix).
	 *
	 * @param name - A name of a spec, an option or a lookup
	 */
	isNamedBy(name: string): boolean {
		if (name === this.#potentialName) {
			return true;
		}
		if (this.#isFrameworkPropName(name)) {
			return false;
		}
		return this.keyOf(name) === this.nameKey;
	}

	/**
	 * Whether the name of this attribute starts with `prefix`, a prefix of an option
	 * (`ignoreAttrNamePrefix`): as it is written, or as the DOM gives the name ({@link MLAttr.keyOf}).
	 * A prefix with a capital letter that code sets on an element of the HTML namespace is the prefix
	 * of a name of the framework, and only its exact spelling is it, as for {@link MLAttr.isNamedBy}.
	 *
	 * @param prefix - A prefix of an option
	 */
	isPrefixedBy(prefix: string): boolean {
		if (this.#potentialName.startsWith(prefix)) {
			return true;
		}
		if (this.#isFrameworkPropName(prefix)) {
			return false;
		}
		return this.nameKey.startsWith(this.keyOf(prefix));
	}

	/**
	 * A name with a capital letter that code sets on an element of the HTML namespace is a prop of the
	 * framework (`defaultValue` of React), not an attribute of the DOM: the DOM folds what `setAttribute`
	 * is given, and a prop is read as it is written.
	 */
	#isFrameworkPropName(name: string): boolean {
		const el = this.ownerElement;
		return el.elementType !== 'authored' && !el.isForeignElement && this.isSetThroughDOMAPI && /[A-Z]/.test(name);
	}

	/**
	 * Whether the name of this attribute reaches the DOM through the DOM API (`setAttribute`) and
	 * not through the HTML parser of the browser: what the parser says of its language
	 * (`MLDocument#attrNameRoute`), and for a parser that says it of a dynamic attribute only
	 * (Svelte), whether this one is dynamic.
	 */
	get isSetThroughDOMAPI(): boolean {
		const route = this.ownerElement.ownerMLDocument.attrNameRoute;
		return route === 'dom-api' || (route === 'dom-api-when-dynamic' && this.isDynamicValue === true);
	}

	/**
	 * Whether a selector matches the name of this attribute without regard to ASCII case: the DOM
	 * does so for an element of the HTML namespace and not for one of SVG or MathML, nor for a prop.
	 *
	 * @implements `SelectorAttr#nameCaseInsensitive` of `@markuplint/selector`
	 */
	get nameCaseInsensitive(): boolean {
		const el = this.ownerElement;
		return el.elementType !== 'authored' && !el.isForeignElement;
	}

	/**
	 * The name that a selector is matched with.
	 *
	 * @implements `SelectorAttr#domName` of `@markuplint/selector`
	 */
	get domName(): string {
		return this.nameKey;
	}

	/**
	 * Whether a name of a selector is this prop once it is camelized: the props of a Vue component.
	 *
	 * @implements `SelectorAttr#nameIsCamelized` of `@markuplint/selector`
	 */
	get nameIsCamelized(): boolean {
		const el = this.ownerElement;
		return el.elementType === 'authored' && el.ownerMLDocument.componentNameVariants;
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
