/* global StylePropertyMap, StylePropertyMapReadOnly */

import type { MLDocument } from './document.js';
import type { MLNamedNodeMap } from './named-node-map.js';
import type { MLNode } from './node.js';
import type { MLText } from './text.js';
import type { ElementNodeType, PretenderContext, PretenderContextPretender } from './types.js';
import type { ElementType, MLASTAttr, MLASTElement, NamespaceURI } from '@markuplint/ml-ast';
import type { PlainData, Pretender, PretenderARIA, RuleConfigValue, RuleInfo } from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { resolveNamespace } from '@markuplint/ml-spec';
import { createSelector } from '@markuplint/selector';

import { getAccname } from '../helper/accname.js';
import {
	after,
	before,
	nextElementSibling,
	previousElementSibling,
	remove,
	replaceWith,
} from '../manipulations/child-node-methods.js';
import { MLToken } from '../token/token.js';

import { MLAttr } from './attr.js';
import { MLDomTokenList } from './dom-token-list.js';
import { MLElementCloseTag } from './element-close-tag.js';
import { toNamedNodeMap } from './named-node-map.js';
import { toHTMLCollection } from './node-list.js';
import { MLParentNode } from './parent-node.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export class MLElement<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLParentNode<T, O, MLASTElement>
	implements Element, HTMLOrSVGElement, HTMLElement
{
	#attributes: MLAttr<T, O>[];
	readonly closeTag: MLElementCloseTag<T, O> | null;

	/**
	 * Element type
	 *
	 * - `html`: From native HTML Standard
	 * - `web-component`: As the Web Component according to HTML Standard
	 * - `authored`:  Authored element (JSX Element etc.) through the view framework or the template engine.
	 */
	readonly elementType: ElementType;
	#fixedNodeName: string;
	#getChildElementsAndTextNodeWithoutWhitespacesCache: (MLElement<T, O> | MLText<T, O>)[] | null = null;
	readonly isForeignElement: boolean;
	readonly isOmitted: boolean;
	#localName: string;
	readonly namespaceURI: NamespaceURI;
	#normalizedAttrs: Map<MLAttr<T, O>[], MLNamedNodeMap<T, O>> = new Map();
	#normalizedString: string | null = null;

	readonly ontouchcancel?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchend?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchmove?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchstart?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	pretenderContext: PretenderContext<MLElement<T, O>, T, O> | null = null;
	readonly selfClosingSolidus: MLToken | null;
	readonly tagCloseChar: string;
	readonly tagOpenChar: string;

	constructor(
		astNode: MLASTElement,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
	) {
		super(astNode, document, astNode.isFragment);
		this.#attributes = astNode.attributes.map(attr => new MLAttr(attr, this));
		this.selfClosingSolidus = astNode.selfClosingSolidus ? new MLToken(astNode.selfClosingSolidus) : null;
		this.closeTag = astNode.pairNode ? new MLElementCloseTag(astNode.pairNode, document, this) : null;
		const ns = resolveNamespace(astNode.nodeName, astNode.namespace);
		this.namespaceURI = ns.namespaceURI;
		this.elementType = astNode.elementType;
		this.#localName = ns.localName;
		this.isForeignElement = this.namespaceURI !== HTML_NAMESPACE;
		this.#fixedNodeName = astNode.nodeName;

		this.isOmitted = astNode.isGhost;

		this.tagOpenChar = astNode.tagOpenChar;
		this.tagCloseChar = astNode.tagCloseChar;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get accessKey(): string {
		throw new UnexpectedCallError('Not supported "accessKey" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get accessKeyLabel(): string {
		throw new UnexpectedCallError('Not supported "accessKeyLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaAtomic(): string | null {
		throw new UnexpectedCallError('Not supported "ariaAtomic" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaAutoComplete(): string | null {
		throw new UnexpectedCallError('Not supported "ariaAutoComplete" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBrailleLabel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBrailleLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBrailleRoleDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBrailleRoleDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBusy(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBusy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaChecked(): string | null {
		throw new UnexpectedCallError('Not supported "ariaChecked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColCount(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColCount" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColIndex(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColIndex" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColIndexText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColIndexText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColSpan(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColSpan" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaCurrent(): string | null {
		throw new UnexpectedCallError('Not supported "ariaCurrent" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDisabled(): string | null {
		throw new UnexpectedCallError('Not supported "ariaDisabled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaExpanded(): string | null {
		throw new UnexpectedCallError('Not supported "ariaExpanded" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaHasPopup(): string | null {
		throw new UnexpectedCallError('Not supported "ariaHasPopup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaHidden(): string | null {
		throw new UnexpectedCallError('Not supported "ariaHidden" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaInvalid(): string | null {
		throw new UnexpectedCallError('Not supported "ariaInvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaKeyShortcuts(): string | null {
		throw new UnexpectedCallError('Not supported "ariaKeyShortcuts" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLabel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLevel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLevel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLive(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLive" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaModal(): string | null {
		throw new UnexpectedCallError('Not supported "ariaModal" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaMultiLine(): string | null {
		throw new UnexpectedCallError('Not supported "ariaMultiLine" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaMultiSelectable(): string | null {
		throw new UnexpectedCallError('Not supported "ariaMultiSelectable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaOrientation(): string | null {
		throw new UnexpectedCallError('Not supported "ariaOrientation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPlaceholder(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPlaceholder" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPosInSet(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPosInSet" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPressed(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPressed" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaReadOnly(): string | null {
		throw new UnexpectedCallError('Not supported "ariaReadOnly" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRequired(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRequired" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRoleDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRoleDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowCount(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowCount" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowIndex(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowIndex" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowIndexText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowIndexText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowSpan(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowSpan" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSelected(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSelected" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSetSize(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSetSize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSort(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueMax(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueMax" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueMin(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueMin" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueNow(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueNow" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-slotable-assignedslot
	 */
	get assignedSlot(): HTMLSlotElement | null {
		throw new UnexpectedCallError('Not supported "assignedSlot" property');
	}

	get attributeStyleMap(): StylePropertyMap {
		throw new UnexpectedCallError('Not supported "attributeStyleMap" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-attributes
	 */
	get attributes(): MLNamedNodeMap<T, O> {
		const origin =
			this.pretenderContext?.type === 'pretender' ? this.pretenderContext.as.#attributes : this.#attributes;

		if (this.#normalizedAttrs.has(origin)) {
			return this.#normalizedAttrs.get(origin)!;
		}

		const names = new Set<string>();
		const attrs: MLAttr<T, O>[] = [];

		for (const attr of origin) {
			if (names.has(attr.name)) {
				/**
				 * Skips a duplicated attribute
				 *
				 *@see https://html.spec.whatwg.org/#parse-error-duplicate-attribute
				 */
				continue;
			}

			attrs.push(attr);
		}

		const map = toNamedNodeMap(attrs);
		this.#normalizedAttrs.set(origin, map);
		return map;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get autocapitalize(): string {
		throw new UnexpectedCallError('Not supported "autocapitalize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get autofocus(): boolean {
		throw new UnexpectedCallError('Not supported "autofocus" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-classlist%E2%91%A0
	 */
	get classList(): MLDomTokenList {
		const classAttrs = this.getAttributeToken('class');
		const value = classAttrs.map(c => c.value).join(' ');
		return new MLDomTokenList(value, classAttrs);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-classname%E2%91%A0
	 */
	get className() {
		return this.classList.value;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientheight-1
	 */
	get clientHeight(): number {
		throw new UnexpectedCallError('Not supported "clientHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientleft-1
	 */
	get clientLeft(): number {
		throw new UnexpectedCallError('Not supported "clientLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clienttop-1
	 */
	get clientTop(): number {
		throw new UnexpectedCallError('Not supported "clientTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientwidth-1
	 */
	get clientWidth(): number {
		throw new UnexpectedCallError('Not supported "clientWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get contentEditable(): string {
		throw new UnexpectedCallError('Not supported "contentEditable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get dataset(): DOMStringMap {
		throw new UnexpectedCallError('Not supported "dataset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get dir(): string {
		throw new UnexpectedCallError('Not supported "dir" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get draggable(): boolean {
		throw new UnexpectedCallError('Not supported "draggable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get enterKeyHint(): string {
		throw new UnexpectedCallError('Not supported "enterKeyHint" property');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	get fixedNodeName() {
		return this.#fixedNodeName;
	}

	get hasSpreadAttr() {
		return this.#attributes.some(attr => attr.localName === '#spread');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get hidden(): boolean {
		throw new UnexpectedCallError('Not supported "hidden" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-id%E2%91%A0
	 */
	get id() {
		return this.getAttribute('id') ?? '';
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/interaction.html#dom-inert
	 */
	get inert(): boolean {
		throw new UnexpectedCallError('Not supported "inert" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml
	 */
	get innerHTML(): string {
		throw new UnexpectedCallError('Not supported "innerHTML" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get innerText(): string {
		throw new UnexpectedCallError('Not supported "innerText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get inputMode(): string {
		throw new UnexpectedCallError('Not supported "inputMode" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get isContentEditable(): boolean {
		throw new UnexpectedCallError('Not supported "isContentEditable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get lang(): string {
		throw new UnexpectedCallError('Not supported "lang" property');
	}

	/**
	 * Returns a lowercase name if it is an HTML element.
	 *
	 * ```html
	 * <div> => "div"
	 * <DIV> => "div"
	 * <svg> => "svg"
	 * <foreignObject> => "foreignObject"
	 * <x-foo> => "x-foo"
	 * <X-FOO> => "x-foo"
	 * ```
	 *
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-localname%E2%91%A0
	 */
	get localName(): string {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.localName;
		}
		if (this.isForeignElement || this.elementType !== 'html') {
			return this.#localName;
		}
		if (this.ownerMLDocument.tagNameCaseSensitive) {
			return this.#localName;
		}
		return this.#localName.toLowerCase();
	}

	/**
	 * The element immediately following the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-nextelementsibling%E2%91%A1
	 */
	get nextElementSibling(): MLElement<T, O> | null {
		return nextElementSibling(this);
	}

	/**
	 * Returns a string appropriate for the type of node as `Element`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-element%E2%91%A2%E2%93%AA
	 */
	get nodeName(): string {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.nodeName;
		}
		if (this.isForeignElement || this.elementType !== 'html') {
			return this._astToken.nodeName;
		}
		return this._astToken.nodeName.toUpperCase();
	}

	/**
	 * Returns a number appropriate for the type of `Element`
	 */
	get nodeType(): ElementNodeType {
		return this.ELEMENT_NODE;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get nonce(): string | undefined {
		throw new UnexpectedCallError('Not supported "nonce" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetHeight(): number {
		throw new UnexpectedCallError('Not supported "offsetHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetLeft(): number {
		throw new UnexpectedCallError('Not supported "offsetLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetParent(): Element | null {
		throw new UnexpectedCallError('Not supported "offsetParent" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetTop(): number {
		throw new UnexpectedCallError('Not supported "offsetTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetWidth(): number {
		throw new UnexpectedCallError('Not supported "offsetWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onabort():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: UIEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onabort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationcancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationcancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationiteration():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onauxclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onauxclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onbeforeinput():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: InputEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onbeforeinput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onbeforetoggle():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onbeforetoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onblur():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FocusEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onblur" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplay():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplaythrough():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplaythrough" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclose():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onclose" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncontextmenu():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncontextmenu" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncopy():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncopy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncuechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncut():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondblclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondblclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrag():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondrag" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrop():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondrop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondurationchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondurationchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onemptied():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onemptied" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onended():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onended" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onerror(): OnErrorEventHandler {
		throw new UnexpectedCallError('Not supported "onerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfocus():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FocusEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfocus" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onformdata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FormDataEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onformdata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: Element,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfullscreenchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenerror():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: Element,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfullscreenerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ongotpointercapture():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ongotpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninput():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oninput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninvalid():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oninvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeydown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeydown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeypress():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeypress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeyup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeyup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onload():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onload" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadeddata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadeddata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadedmetadata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadedmetadata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onlostpointercapture():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onlostpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousedown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmousedown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousemove():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmousemove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseout():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpaste():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpaste" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpause():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpause" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplay():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplaying():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onplaying" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointercancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointercancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerdown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerdown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointermove():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointermove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerout():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onprogress():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ProgressEvent<EventTarget>,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onprogress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onratechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onratechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onreset():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onreset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onresize():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: UIEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onresize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onscroll():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onscroll" property');
	}

	get onscrollend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onscrollend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsecuritypolicyviolation():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: SecurityPolicyViolationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsecuritypolicyviolation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeked():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onseeked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeking():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onseeking" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselect():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselect" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectionchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselectionchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselectstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onslotchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onstalled():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onstalled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsubmit():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: SubmitEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsubmit" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsuspend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsuspend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontimeupdate():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontimeupdate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontoggle():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitioncancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitioncancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionrun():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionrun" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onvolumechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onvolumechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwaiting():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwaiting" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationiteration():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkittransitionend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkittransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwheel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: WheelEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwheel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#dom-element-outerhtml
	 */
	get outerHTML(): string {
		throw new UnexpectedCallError('Not supported "outerHTML" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get outerText(): string {
		throw new UnexpectedCallError('Not supported "outerText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/css-shadow-parts-1/#idl
	 */
	get part(): DOMTokenList {
		throw new UnexpectedCallError('Not supported "part" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-popover
	 */
	get popover(): string | null {
		throw new UnexpectedCallError('Not supported "popover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-prefix%E2%91%A0
	 */
	get prefix(): string | null {
		throw new UnexpectedCallError('Not supported "prefix" property');
	}

	/**
	 * The element immediately prior the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-previouselementsibling%E2%91%A1
	 */
	get previousElementSibling(): MLElement<T, O> | null {
		return previousElementSibling(this);
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	get rawName() {
		return this._astToken.nodeName;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/aria/#ARIAMixin
	 */
	get role(): string {
		throw new UnexpectedCallError('Not supported "role" property');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get rule(): RuleInfo<T, O> {
		if (this.pretenderContext?.type === 'origin') {
			return this.pretenderContext.origin.rule;
		}

		return super.rule;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollheight-1
	 */
	get scrollHeight(): number {
		throw new UnexpectedCallError('Not supported "scrollHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollleft-1
	 */
	get scrollLeft(): number {
		throw new UnexpectedCallError('Not supported "scrollLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrolltop-1
	 */
	get scrollTop(): number {
		throw new UnexpectedCallError('Not supported "scrollTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollwidth-1
	 */
	get scrollWidth(): number {
		throw new UnexpectedCallError('Not supported "scrollWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-shadowroot%E2%91%A0
	 */
	get shadowRoot(): ShadowRoot | null {
		throw new UnexpectedCallError('Not supported "shadowRoot" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-slot%E2%91%A0
	 */
	get slot() {
		return this.getAttribute('slot') ?? '';
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get spellcheck(): boolean {
		throw new UnexpectedCallError('Not supported "spellcheck" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get style(): CSSStyleDeclaration {
		throw new UnexpectedCallError('Not supported "style" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get tabIndex(): number {
		throw new UnexpectedCallError('Not supported "tabIndex" property');
	}

	/**
	 * Returns the HTML-uppercased qualified name.
	 *
	 * If this is in the HTML namespace and its node document is an HTML document, then set qualifiedName to qualifiedName in ASCII uppercase.
	 *
	 * (In markuplint evaluation, the node document always is an HTML document.)
	 *
	 * ```html
	 * <div> => "DIV"
	 * <svg> => "svg"
	 * <x-foo> => "X-FOO"
	 * ```
	 *
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-tagname%E2%91%A0
	 */
	get tagName() {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.nodeName;
		}
		return this.nodeName;
	}

	get textContent(): string {
		return [...this.childNodes].map(child => child.textContent ?? '').join('');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get title(): string {
		throw new UnexpectedCallError('Not supported "title" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get translate(): boolean {
		throw new UnexpectedCallError('Not supported "translate" property');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	after(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLNode<any, any>)[]
	): void {
		after(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/web-animations-1/#dom-animatable-animate
	 */
	animate(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: number | KeyframeAnimationOptions,
	): Animation {
		throw new UnexpectedCallError('Not supported "animate" method');
	}

	/**
	 * @see https://html.spec.whatwg.org/multipage/scripting.html#dom-slot-assignednodes
	 */
	assignedNodes() {
		if (this.localName !== 'slot') {
			throw new TypeError('assignedNodes is not a function');
		}

		return [];
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	attachInternals(): ElementInternals {
		throw new UnexpectedCallError('Not supported "attachInternals" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-attachshadow%E2%91%A0
	 */
	attachShadow(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		init: ShadowRootInit,
	): ShadowRoot {
		throw new UnexpectedCallError('Not supported "attachShadow" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	before(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		before(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	blur(): void {
		throw new UnexpectedCallError('Not supported "blur" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	checkVisibility(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: CheckVisibilityOptions,
	): boolean {
		throw new UnexpectedCallError('Not supported "checkVisibility" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	click(): void {
		throw new UnexpectedCallError('Not supported "click" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0
	 */
	closest(selectors: string): MLElement<T, O> | null {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let el: MLElement<T, O> | null = this;

		do {
			if (el.matches(selectors)) {
				return el;
			}
			el = el.parentElement;
		} while (el !== null && el.is(el.ELEMENT_NODE));

		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	computedStyleMap(): StylePropertyMapReadOnly {
		throw new UnexpectedCallError('Not supported "computedStyleMap" method');
	}

	fixNodeName(name: string) {
		this.#fixedNodeName = name;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	focus(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: FocusOptions,
	): void {
		throw new UnexpectedCallError('Not supported "focus" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getAccessibleName(version: ARIAVersion): string {
		return getAccname(this, version);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/web-animations-1/#dom-animatable-getanimations
	 */
	getAnimations(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: GetAnimationsOptions,
	): Animation[] {
		throw new UnexpectedCallError('Not supported "getAnimations" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattribute%E2%91%A0
	 */
	getAttribute(attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr.value;
			}
		}
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenodens
	 */
	getAttributeNS(namespace: string | null, localName: string): string | null {
		throw new UnexpectedCallError('Not supported "getAttributeNS" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattributenames%E2%91%A0
	 */
	getAttributeNames(): string[] {
		return [...this.attributes].map(attr => attr.name);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenode
	 */
	getAttributeNode(qualifiedName: string): MLAttr<T, O> | null {
		return this.getAttributeToken(qualifiedName)[0] ?? null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenodens
	 */
	getAttributeNodeNS(namespace: string | null, localName: string): Attr | null {
		throw new UnexpectedCallError('Not supported "getAttributeNodeNS" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getAttributePretended(attrName: string) {
		for (const attr of this.#attributes) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr.value;
			}
		}
		return null;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getAttributeToken(attrName: string) {
		const attrs: MLAttr<T, O>[] = [];
		attrName = attrName.toLowerCase();
		for (const attr of this.getAttributeTokens()) {
			if (attr.name === attrName) {
				attrs.push(attr);
			}
		}
		return attrs;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getAttributeTokens() {
		return Object.freeze(
			this.pretenderContext?.type === 'pretender' ? this.pretenderContext.as.#attributes : this.#attributes,
		);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-getboundingclientrect-1
	 */
	getBoundingClientRect(): DOMRect {
		throw new UnexpectedCallError('Not supported "getBoundingClientRect" method');
	}

	getChildElementsAndTextNodeWithoutWhitespaces() {
		if (this.#getChildElementsAndTextNodeWithoutWhitespacesCache) {
			return this.#getChildElementsAndTextNodeWithoutWhitespacesCache;
		}
		const filteredNodes: (MLElement<T, O> | MLText<T, O>)[] = [];
		for (const node of this.childNodes) {
			if (node.is(node.ELEMENT_NODE)) {
				if (node.isOmitted) {
					const children = node.getChildElementsAndTextNodeWithoutWhitespaces();
					filteredNodes.push(...children);
				} else {
					filteredNodes.push(node);
				}
			}
			if (node.is(node.TEXT_NODE) && !node.isWhitespace()) {
				filteredNodes.push(node);
			}
		}
		this.#getChildElementsAndTextNodeWithoutWhitespacesCache = filteredNodes;
		return filteredNodes;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-getclientrects-1
	 */
	getClientRects(): DOMRectList {
		throw new UnexpectedCallError('Not supported "getClientRects" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getelementsbyclassname
	 */
	getElementsByClassName(classNames: string): HTMLCollectionOf<MLElement<T, O>> {
		return toHTMLCollection(
			this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE) && node.classList.contains(classNames)) {
					return node;
				}
			}),
		);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getelementsbyclassname
	 */
	getElementsByTagName(qualifiedName: string): ReturnType<(typeof Element)['prototype']['getElementsByTagName']> {
		return toHTMLCollection(
			this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE) && node.nodeName.toLowerCase() === qualifiedName.toLowerCase()) {
					return node;
				}
			}),
		);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getelementsbytagnamens
	 */
	getElementsByTagNameNS(namespace: any, localName: any): any {
		throw new UnexpectedCallError('Not supported "getElementsByTagNameNS" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getNameLocation() {
		return {
			offset: this.startOffset,
			line: this.startLine,
			col: this.startCol + this.tagOpenChar.length,
		};
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-hasattribute%E2%91%A0
	 */
	hasAttribute(qualifiedName: string): boolean {
		return this.getAttribute(qualifiedName) !== null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-hasattributens%E2%91%A0
	 */
	hasAttributeNS(namespace: string | null, localName: string): boolean {
		throw new UnexpectedCallError('Not supported "hasAttributeNS" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-hasattributes
	 */
	hasAttributes() {
		return this.attributes.length > 0;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	hasMutableAttributes() {
		for (const attr of this.attributes) {
			if (!attr.nameNode) {
				return true;
			}
			if (attr.isDynamicValue) {
				return true;
			}
		}
		return false;
	}

	/**
	 * This element has "Preprocessor Specific Block". In other words, Its children are potentially mutable.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	hasMutableChildren(attr = false) {
		for (const child of this.getPureChildNodes()) {
			if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
				if (child.conditionalType) {
					continue;
				}
				return true;
			}
			if (child.is(child.ELEMENT_NODE)) {
				if (attr && child.hasMutableAttributes()) {
					return true;
				}
				if (child.hasMutableChildren(attr)) {
					return true;
				}
				if (child.localName === 'slot') {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#dom-element-haspointercapture
	 */
	hasPointerCapture(pointerId: number): boolean {
		throw new UnexpectedCallError('Not supported "hasPointerCapture" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-hidepopover
	 */
	hidePopover(): void {
		throw new UnexpectedCallError('Not supported "hidePopover" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-insertadjacentelement
	 */
	insertAdjacentElement(
		where: InsertPosition,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		element: MLElement<T, O>,
	): MLElement<T, O> | null {
		// TODO:
		throw new UnexpectedCallError('Does not implement "insertAdjacentElement" method yet');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#widl-Element-insertAdjacentHTML-void-DOMString-position-DOMString-text
	 */
	insertAdjacentHTML(position: InsertPosition, text: string): void {
		// TODO:
		throw new UnexpectedCallError('Does not implement "insertAdjacentHTML" method yet');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-insertadjacenttext
	 */
	insertAdjacentText(where: InsertPosition, data: string): void {
		// TODO:
		throw new UnexpectedCallError('Does not implement "insertAdjacentText" method yet');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	isDescendantByUUIDList(uuidList: readonly string[]) {
		let el = this.parentElement;

		if (el === null) {
			return false;
		}

		do {
			if (uuidList.includes(el.uuid)) {
				return true;
			}
			el = el.parentElement;
		} while (el !== null && el.is(el.ELEMENT_NODE));
		return false;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	isEmpty() {
		for (const childNode of this.childNodes) {
			if (!(childNode.is(childNode.TEXT_NODE) && childNode.textContent?.trim() === '')) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-matches%E2%91%A0
	 */
	matches(
		selector: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope?: MLParentNode<T, O>,
	): boolean {
		let matched = false;
		const selectorMatcher = createSelector(selector, this.ownerMLDocument.specs);
		if (this.pretenderContext?.type === 'pretender') {
			matched = selectorMatcher.match(this, scope) !== false;
		}

		if (matched) {
			return true;
		}

		let _pretender: PretenderContextPretender<MLElement<T, O>, T, O> | null = null;
		// don't expose pretenders temporarily
		if (this.pretenderContext?.type === 'pretender') {
			_pretender = this.pretenderContext;
			this.pretenderContext = null;
		}

		matched = selectorMatcher.match(this, scope) !== false;

		if (_pretender) {
			this.pretenderContext = _pretender;
		}

		return matched;
	}

	/**
	 * Pretenders Initialization
	 */
	pretending(pretenders?: readonly Pretender[]) {
		const pretenderConfig = pretenders?.find(option => this.matches(option.selector));
		const asAttrValue = this.getAttribute('as');
		const pretenderElement: Pretender['as'] | null =
			pretenderConfig?.as ??
			(this.elementType === 'html' || !asAttrValue
				? null
				: {
						element: asAttrValue,
						inheritAttrs: true,
					});

		if (pretenderElement == null) {
			return;
		}

		let nodeName: string;
		let namespace = 'html';
		const attributes: MLASTAttr[] = [];
		let aria: PretenderARIA | undefined;
		if (typeof pretenderElement === 'string') {
			nodeName = pretenderElement;
		} else {
			nodeName = pretenderElement.element;
			namespace = pretenderElement.namespace ?? namespace;
			if (pretenderElement.inheritAttrs) {
				attributes.push(...this._astToken.attributes);
			}
			if (pretenderElement.attrs) {
				attributes.push(
					...pretenderElement.attrs.map(({ name, value }, i) => {
						const _value =
							value == null
								? ''
								: typeof value === 'string'
									? value
									: (this.getAttribute(value.fromAttr) ?? '');
						return {
							...this._astToken,
							uuid: `${this.uuid}_attr_${i}`,
							type: 'attr',
							nodeName: name,
							spacesBeforeName: {
								...this._astToken,
								raw: '',
							},
							name: {
								...this._astToken,
								raw: name,
							},
							spacesBeforeEqual: {
								...this._astToken,
								raw: '',
							},
							equal: {
								...this._astToken,
								raw: '',
							},
							spacesAfterEqual: {
								...this._astToken,
								raw: '',
							},
							startQuote: {
								...this._astToken,
								raw: '',
							},
							value: {
								...this._astToken,
								raw: _value,
							},
							endQuote: {
								...this._astToken,
								raw: '',
							},
							isDuplicatable: true,
							parentNode: null,
							nextNode: null,
							prevNode: null,
							isFragment: false,
							isGhost: false,
						} as MLASTAttr;
					}),
				);
			}
			aria = pretenderElement.aria;
		}

		const as = new MLElement<T, O>(
			{
				...this._astToken,
				uuid: this.uuid + '_pretender',
				raw: `<${nodeName}>`,
				nodeName,
				namespace,
				elementType: 'html',
				attributes,
			},
			this.ownerMLDocument,
		);

		as.resetChildren(this.childNodes);
		as.pretenderContext = {
			type: 'origin',
			origin: this,
		};

		this.pretenderContext = {
			type: 'pretender',
			as,
			aria,
		};
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#dom-element-releasepointercapture
	 */
	releasePointerCapture(pointerId: number): void {
		throw new UnexpectedCallError('Not supported "releasePointerCapture" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	remove(): void {
		remove(this);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-removeattribute
	 */
	removeAttribute(qualifiedName: string): void {
		throw new UnexpectedCallError('Not supported "removeAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-removeattributens%E2%91%A0
	 */
	removeAttributeNS(namespace: string | null, localName: string): void {
		throw new UnexpectedCallError('Not supported "removeAttributeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-D589198
	 */
	removeAttributeNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr {
		throw new UnexpectedCallError('Not supported "removeAttributeNode" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	replaceWith(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		replaceWith(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://fullscreen.spec.whatwg.org/#dom-element-requestfullscreen
	 */
	requestFullscreen(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: FullscreenOptions,
	): Promise<void> {
		throw new UnexpectedCallError('Not supported "requestFullscreen" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/pointerlock/#dom-element-requestpointerlock
	 */
	requestPointerLock(): void {
		throw new UnexpectedCallError('Not supported "requestPointerLock" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scroll
	 */
	scroll(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scroll" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollby
	 */
	scrollBy(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scrollBy" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollintoview
	 */
	scrollIntoView(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		arg?: boolean | ScrollIntoViewOptions,
	): void {
		throw new UnexpectedCallError('Not supported "scrollIntoView" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollto
	 */
	scrollTo(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scrollTo" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-setattribute%E2%91%A0
	 */
	setAttribute(qualifiedName: string, value: string): void {
		throw new UnexpectedCallError('Not supported "setAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-setattributens%E2%91%A0
	 */
	setAttributeNS(namespace: string | null, qualifiedName: string, value: string): void {
		throw new UnexpectedCallError('Not supported "setAttributeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenode
	 */
	setAttributeNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenodens
	 */
	setAttributeNodeNS(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNodeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-sethtmlunsafe
	 */
	setHTMLUnsafe(html: string): void {
		throw new UnexpectedCallError('Not supported "setHTMLUnsafe" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#idl-def-element-setpointercapture-pointerid
	 */
	setPointerCapture(pointerId: number): void {
		throw new UnexpectedCallError('Not supported "setPointerCapture" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-showpopover
	 */
	showPopover(): void {
		throw new UnexpectedCallError('Not supported "showPopover" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	toNormalizeString(): string {
		if (this.#normalizedString) {
			return this.#normalizedString;
		}

		const children = this.getChildElementsAndTextNodeWithoutWhitespaces();
		const attrs = this.attributes.map(attr => attr.toNormalizeString());
		const attrString = attrs.length > 0 ? ' ' + attrs.join('') : '';
		const startTag = `<${this.nodeName}${attrString}>`;
		const childNodes = children.map(node => {
			if (node.is(node.ELEMENT_NODE)) {
				return node.toNormalizeString();
			}
			return node.raw;
		});
		const endTag = `</${this.nodeName}>`;
		const normalizedString = `${startTag}${childNodes.join('')}${endTag}`;

		this.#normalizedString = normalizedString;
		return normalizedString;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	toString(fixed = false) {
		if (!fixed) {
			return this.raw;
		}

		if (this.pretenderContext?.type === 'pretender') {
			return this.raw;
		}

		if (this.nodeName.startsWith('#')) {
			return this.raw;
		}

		if (this.isOmitted) {
			return this.raw;
		}

		let raw = this.raw;
		let offset = 0;

		const overriddenCommentNodes = this.ownerMLDocument.nodeList.filter(node => {
			if (node.is(node.COMMENT_NODE)) {
				return this.startOffset < node.startOffset && node.endOffset < this.endOffset;
			}
			return false;
		});

		const nodes = [
			{
				toString: () => this.tagOpenChar + this.fixedNodeName,
				startOffset: this.startOffset,
				endOffset: this.startOffset + this.tagOpenChar.length + this.nodeName.length,
			},
			...overriddenCommentNodes,
			...this.attributes,
		];
		for (const node of nodes) {
			const before = raw.slice(0, node.startOffset + offset - this.startOffset);
			const rawCode = node.toString(true);
			const after = raw.slice(node.endOffset + offset - this.startOffset);
			raw = before + rawCode + after;
			offset += rawCode.length - (node.endOffset - node.startOffset);
		}

		return raw;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-toggleattribute%E2%91%A0
	 */
	toggleAttribute(qualifiedName: string, force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "toggleAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-togglepopover
	 */
	togglePopover(force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "togglePopover" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	webkitMatchesSelector(selectors: string): boolean {
		throw new UnexpectedCallError('Not supported "webkitMatchesSelector" method');
	}
}
