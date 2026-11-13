import type { MLElement } from './element.js';
import type { AttributeNodeType } from './types.js';
import type { LiteralRenderingContext } from '../helper/literal-values.js';
import type { ExpressionLanguage, MLASTAttr } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';
import type { LiteralExpression } from '@markuplint/parser-utils';

import { resolveNamespace } from '@markuplint/ml-spec';
import { parseLiteralExpression } from '@markuplint/parser-utils';

import { adjustForeignAttrName } from '../helper/foreign-attr-names.js';
import { getBooleanAttrNames, literalToString, renderLiteral } from '../helper/literal-values.js';
import { isPretendedAttr } from '../helper/pretended-attrs.js';
import { resolveAttrNames } from '../helper/resolve-attr-names.js';
import { MLToken } from '../token/token.js';

import { MLDomTokenList } from './dom-token-list.js';
import { MLNode } from './node.js';
import { asciiLowerCase, vuePropKey } from '@markuplint/shared';

/**
 * Represents a DOM Attr (attribute) node wrapper in the markuplint DOM tree.
 * Wraps an AST attribute token and provides access to the attribute's name, value,
 * tokens (name, equal sign, quotes, value), and metadata such as whether
 * the attribute is a directive or has a dynamic value.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLAttr<T extends RuleConfigValue, O extends PlainData = undefined> extends MLNode<T, O, MLASTAttr> {
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
	 * Whether the value of this attribute is written as code (`{x}` of JSX, `:x="…"` of Vue, a value of
	 * `=` in Pug, a masked block of a template language), whatever the code is: a literal (`{true}`) or not
	 * (`{cond}`). It is a matter of syntax, which a rule that checks how the value is written reads
	 * (`attr-value-quotes`, `no-unescaped-char`), while {@link MLAttr.isDynamicValue} is a matter of the
	 * value that results.
	 */
	readonly isExpressionValue?: true;
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
	readonly #literal: LiteralExpression | null = null;
	readonly #isPretended: boolean = false;
	readonly #valueType: 'string' | 'number' | 'boolean' | 'code' = 'string';
	#rendering?: Rendering;
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
			this.#valueType = 'code';
			this.#localName = '#spread';
			this.#potentialName = '#spread';
			this.#potentialValue = this._astToken.raw;
			this.isDirective = true;
			this.isExpressionValue = true;
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
		this.#isPretended = isPretendedAttr(this._astToken);

		const resolved = resolveAttrNames(this._astToken, ownElement.ownerMLDocument.specs);
		this.#potentialName = resolved.potentialName;
		this.candidate = resolved.candidate;
		this.isExpressionValue = resolved.isDynamicValue;
		this.isDirective = resolved.isDirective;
		this.isDuplicatable = resolved.isDuplicatable;
		if (resolved.valueType) {
			this.#valueType = resolved.valueType;
		}
		// The language that the value is written in, when the value is code of a language that can be read as a literal
		const language: ExpressionLanguage | undefined =
			resolved.expressionLanguage === 'inherit'
				? ownElement.ownerMLDocument.attrExpressionLanguage
				: resolved.expressionLanguage;

		this.#literal = this.#readLiteral(language);

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
	 * Whether the framework does not output this attribute, which is known from its value being a literal
	 * that the framework drops (`disabled={false}`, `title={null}`). It is still in the list of the
	 * attributes of the element (`MLElement#attributes`), as a name that is misspelled is so whatever its
	 * value is, and a lookup by name (`getAttrValue`, `hasAttr`) does not find it, as the DOM does not.
	 * An absent attribute is {@link MLAttr.isDynamicValue} as well, so that a rule that reads the value skips it.
	 *
	 * Which rules skip it: a rule that judges the value or the presence of an attribute (the value of
	 * `aria-*`, a required attribute, a conflict between two attributes) reads what the framework outputs,
	 * and an attribute that is not output is not there to judge. A rule that judges the name (a misspelling,
	 * a deprecated or obsolete attribute, the order) judges what the author wrote, so it still reports an
	 * absent attribute.
	 */
	get isAbsent(): true | undefined {
		return this.#render().absent ? true : undefined;
	}

	/**
	 * Whether the value of this attribute is not known: the code is not a literal (`{cond}`), the
	 * framework renders a literal in a way that is not known (`disabled={""}`), or the attribute is
	 * not output ({@link MLAttr.isAbsent}), where there is no value to read.
	 *
	 * It is not whether the value is written as code (that is {@link MLAttr.isExpressionValue}): a
	 * literal that is written as code (`aria-busy={true}`) is rendered by the framework to a value
	 * (`"true"`), which is known.
	 *
	 * A rule that reads it to skip a value that it cannot know reads this; a rule that asks how the
	 * value is written (its quotes, its escapes) reads {@link MLAttr.isExpressionValue} instead.
	 *
	 * On a component (`elementType: "authored"`) an attribute is a prop, which is rendered where it is
	 * forwarded to, not here: a literal in it is not dynamic, and its `value` is the string form of the
	 * literal ({@link MLAttr.literal}). What the component renders is not known, and that is told by
	 * `MLElement#hasMutableChildren`, not by the attributes of the component.
	 */
	get isDynamicValue(): true | undefined {
		return this.#render().dynamic ? true : undefined;
	}

	/**
	 * Whether this attribute is made by a pretender (`pretenders` of a configuration): it is not in the
	 * source, so the position of its tokens is that of the element, and a fix of a violation on it
	 * would rewrite the tag.
	 *
	 * An attribute that a pretender takes over from the source (`inheritAttrs`) is not.
	 *
	 * A fix of a violation that is reported on a pretended attribute is dropped (`MLRule`), and a rule
	 * that fixes by the range of the attributes of an element (`attr-order`) leaves them out.
	 */
	get isPretended(): boolean {
		return this.#isPretended;
	}

	/**
	 * The literal that the value of this attribute is written as, when it is nothing but a literal in a
	 * language that can be read as one: `{true}`, `{"x"}`, `:x="0"`, or no value at all in the
	 * shorthand of JSX (`<div aria-hidden>` is `true`). `null` otherwise.
	 *
	 * What a literal is rendered as depends on the framework, the element and the attribute name
	 * ({@link MLAttr.value}, {@link MLAttr.isAbsent}); this is what is written.
	 */
	get literal(): LiteralExpression | null {
		return this.#literal;
	}

	/**
	 * Returns the "string" if HTML syntax. Otherwise, returns a type in its syntax. An attribute whose value
	 * is a literal that is resolved is "string", whichever language it is written in.
	 *
	 * @default "string"
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	get valueType(): 'string' | 'number' | 'boolean' | 'code' {
		return this.#render().resolved ? 'string' : this.#valueType;
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
	 * It is computed when asked, not stored by the constructor: it reads the owner element (its
	 * type and namespace) and the document, which are complete only after the attribute is built.
	 *
	 * @param name - A name as written
	 * @returns The key that two spellings of one attribute share
	 */
	keyOf(name: string): string {
		const el = this.ownerElement;
		if (el.elementType === 'authored') {
			return el.ownerMLDocument.componentNameVariants ? vuePropKey(name) : name;
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
	 * @returns `true` if `name` is this attribute
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
	 * @returns `true` if the name of this attribute starts with `prefix`
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
	 * (Svelte), whether this one is written as code: how its name is set is a matter of how it is
	 * written, not of the value that results.
	 */
	get isSetThroughDOMAPI(): boolean {
		const route = this.ownerElement.ownerMLDocument.attrNameRoute;
		return route === 'dom-api' || (route === 'dom-api-when-dynamic' && this.isExpressionValue === true);
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
	 * Whether the framework does not output this attribute, so that no selector matches it
	 * ({@link MLAttr.isAbsent}). It is a boolean because `SelectorAttr#absent` of `@markuplint/selector`
	 * is the one that a selector reads.
	 *
	 * @implements `SelectorAttr#absent` of `@markuplint/selector`
	 */
	get absent(): boolean {
		return this.isAbsent === true;
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
	 * @implements `@markuplint/ml-core` API: `MLAttr`
	 */
	get rule() {
		return this.ownerElement.rule;
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
		return this.#render().value;
	}

	/**
	 * Reads the literal that the value is written as, which is decided by the language of the
	 * code: what the parser says for the attribute it reads, what the directive pattern says for the
	 * one that a spec resolves, and always JavaScript for the one that a pretender makes.
	 *
	 * An attribute that has no value (`:disabled`, which Vue reads as `:disabled="disabled"`) is not the
	 * empty string, and a value that is not an attribute value (the condition of a directive, a
	 * `{name}` shorthand, which have a `potentialName`) is not read.
	 *
	 * @param language - The language that the parser or the pattern says
	 */
	#readLiteral(language: ExpressionLanguage | undefined): LiteralExpression | null {
		if (this.isDirective || !this.valueNode) {
			return null;
		}

		if (this.isExpressionValue) {
			const isJavaScript = this.#isPretended || language === 'javascript';
			// A value that is not written has no equal sign. A pretender's expression has none either.
			const isWritten = this.#isPretended || this.equal?.raw !== '';
			// `potentialValue` is the expression itself when the value of the token has more than it
			// (Svelte's `disabled="{false}"` is the expression `false` in quotes)
			return isJavaScript && isWritten ? parseLiteralExpression(this.#potentialValue) : null;
		}

		// The shorthand of JSX: an attribute without a value is `true`. An attribute that a pretender made has no
		// tokens of a value either, and is not written in JSX.
		const document = this.ownerElement.ownerMLDocument;
		if (
			document.booleanish &&
			!this.#isPretended &&
			this._astToken.type === 'attr' &&
			this._astToken.potentialName == null &&
			this.equal?.raw === '' &&
			this.valueNode.raw === ''
		) {
			return { type: 'boolean', value: true, key: 'true' };
		}

		return null;
	}

	/**
	 * What the attribute is: the value, whether it is known, and whether it is output at all.
	 * A literal is rendered as the framework renders it (see `renderLiteral`), which depends on the
	 * owner element, so it is done on first use and not by the constructor: `MLElement` makes its
	 * attributes before it knows its own type.
	 */
	#render(): Rendering {
		if (this.#rendering) {
			return this.#rendering;
		}

		const literal = this.#literal;
		let rendering: Rendering;
		if (!literal) {
			rendering = {
				value: this.#potentialValue,
				dynamic: this.isExpressionValue === true,
				absent: false,
				resolved: false,
			};
		} else if (this.ownerElement.elementType === 'authored') {
			// A component receives the literal as a prop. It is rendered by the element that the
			// prop is forwarded to, which is not known here.
			rendering = { value: literalToString(literal), dynamic: false, absent: false, resolved: true };
		} else {
			const rendered = renderLiteral(literal, this.#renderingContext());
			switch (rendered.kind) {
				case 'value': {
					rendering = { value: rendered.value, dynamic: false, absent: false, resolved: true };
					break;
				}
				case 'absent': {
					rendering = { value: '', dynamic: true, absent: true, resolved: true };
					break;
				}
				default: {
					rendering = { value: '', dynamic: true, absent: false, resolved: false };
				}
			}
		}

		// Before the owner element is complete, what depends on it is not final
		if (this.ownerElement.elementType !== undefined) {
			this.#rendering = rendering;
		}
		return rendering;
	}

	#renderingContext(): LiteralRenderingContext {
		const el = this.ownerElement;
		const document = el.ownerMLDocument;
		const specs = document.specs;
		const name = asciiLowerCase(this.#potentialName);
		return {
			name,
			isBoolean: getBooleanAttrNames(specs).has(name),
			// A target of a pretender is made as an element of HTML even when its name is a custom element's
			isCustomElement:
				el.elementType === 'web-component' ||
				(el.elementType === 'html' && !el.isForeignElement && el.localName.includes('-')),
			specLiteralValues: specs.literalValues,
			parserLiteralValues: document.literalValues,
		};
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

/**
 * What an attribute is once its value is read.
 */
type Rendering = {
	/** The attribute value. For code that is not a literal, the text of the code. */
	readonly value: string;
	/** `MLAttr#isDynamicValue` */
	readonly dynamic: boolean;
	/** `MLAttr#isAbsent` */
	readonly absent: boolean;
	/** Whether the value is that of a literal that is read: the attribute is a "string" then. */
	readonly resolved: boolean;
};
