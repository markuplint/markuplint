import type { MLDocument } from './document';
import type { MLNamedNodeMap } from './named-node-map';
import type { MLText } from './text';
import type { ElementNodeType } from './types';
import type { MLASTElement, NamespaceURI } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { createSelector } from '@markuplint/selector';

import { stringSplice } from '../../utils/string-splice';
import { getAccname } from '../helper/accname';
import {
	after,
	before,
	nextElementSibling,
	previousElementSibling,
	remove,
	replaceWith,
} from '../manipulations/child-node-methods';
import { MLToken } from '../token/token';

import { MLAttr } from './attr';
import { MLDomTokenList } from './dom-token-list';
import { toNamedNodeMap } from './named-node-map';
import { toHTMLCollection } from './node-list';
import { MLParentNode } from './parent-node';
import UnexpectedCallError from './unexpected-call-error';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export class MLElement<T extends RuleConfigValue, O = null>
	extends MLParentNode<T, O, MLASTElement>
	implements Element, HTMLOrSVGElement, HTMLElement
{
	readonly #attributes: MLAttr<T, O>[];
	#fixedNodeName: string;
	#getChildElementsAndTextNodeWithoutWhitespacesCache: (MLElement<T, O> | MLText<T, O>)[] | null = null;
	#normalizedAttrs: MLNamedNodeMap<T, O> | null = null;
	#normalizedString: string | null = null;
	readonly #tagOpenChar: string;

	readonly closeTag: MLToken | null;
	readonly endSpace: MLToken | null;
	readonly hasSpreadAttr: boolean;
	readonly isCustomElement: boolean;
	readonly isForeignElement: boolean;
	readonly isOmitted: boolean;
	readonly namespaceURI: NamespaceURI;
	readonly ontouchcancel?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
	readonly ontouchend?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
	readonly ontouchmove?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
	readonly ontouchstart?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
	readonly selfClosingSolidus: MLToken | null;

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

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-attributes
	 */
	get attributes(): MLNamedNodeMap<T, O> {
		if (this.#normalizedAttrs) {
			return this.#normalizedAttrs;
		}

		const names = new Set<string>();
		const attrs: MLAttr<T, O>[] = [];

		for (const attr of this.#attributes) {
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

		this.#normalizedAttrs = toNamedNodeMap(attrs);
		return this.#normalizedAttrs;
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
		return this.getAttribute('id') || '';
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
		if (this.isForeignElement || this.isCustomElement) {
			return this._astToken.nodeName;
		}
		return this._astToken.nodeName.toLowerCase();
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
		if (this.isForeignElement || this.isCustomElement) {
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
	get onabort(): ((this: GlobalEventHandlers, ev: UIEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onabort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationcancel(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationcancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationend(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationiteration(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationstart(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onauxclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onauxclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onblur(): ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onblur" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplay(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplaythrough(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oncanplaythrough" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclose(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onclose" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncontextmenu(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "oncontextmenu" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncopy(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "oncopy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncuechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncut(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondblclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondblclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrag(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondrag" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragend(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragenter(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragleave(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragover(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragstart(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrop(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondrop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondurationchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ondurationchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onemptied(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onemptied" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onended(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
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
	get onfocus(): ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onfocus" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onformdata(): ((this: GlobalEventHandlers, ev: FormDataEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onformdata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenchange(): ((this: Element, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onfullscreenchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenerror(): ((this: Element, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onfullscreenerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ongotpointercapture(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ongotpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninput(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oninput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninvalid(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oninvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeydown(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeydown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeypress(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeypress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeyup(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeyup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onload(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onload" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadeddata(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadeddata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadedmetadata(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadedmetadata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onlostpointercapture(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onlostpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousedown(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmousedown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseenter(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseleave(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousemove(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmousemove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseout(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseover(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseup(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpaste(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpaste" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpause(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onpause" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplay(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplaying(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onplaying" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointercancel(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointercancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerdown(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerdown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerenter(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerleave(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointermove(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointermove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerout(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerover(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerup(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onprogress(): ((this: GlobalEventHandlers, ev: ProgressEvent<EventTarget>) => any) | null {
		throw new UnexpectedCallError('Not supported "onprogress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onratechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onratechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onreset(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onreset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onresize(): ((this: GlobalEventHandlers, ev: UIEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onresize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onscroll(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onscroll" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsecuritypolicyviolation(): ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onsecuritypolicyviolation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeked(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onseeked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeking(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onseeking" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselect(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselect" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectionchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselectionchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselectstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onslotchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onstalled(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onstalled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsubmit(): ((this: GlobalEventHandlers, ev: SubmitEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onsubmit" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsuspend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onsuspend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontimeupdate(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ontimeupdate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontoggle(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ontoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitioncancel(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitioncancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionend(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionrun(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionrun" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionstart(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onvolumechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onvolumechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwaiting(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwaiting" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationiteration(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkittransitionend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkittransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwheel(): ((this: GlobalEventHandlers, ev: WheelEvent) => any) | null {
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

	get raw() {
		let fixed = this.originRaw;
		let gap = 0;
		if (this.nodeName !== this.fixedNodeName) {
			fixed = stringSplice(fixed, this.#tagOpenChar.length, this.nodeName.length, this.fixedNodeName);
			gap = gap + this.fixedNodeName.length - this.nodeName.length;
		}
		for (const attr of Array.from(this.attributes)) {
			const startOffset = (attr.spacesBeforeName?.startOffset || attr.startOffset) - this.startOffset;
			const fixedAttr = attr.toString();
			if (attr.originRaw !== fixedAttr) {
				fixed = stringSplice(fixed, startOffset + gap, attr.originRaw.length, fixedAttr);
				gap = gap + fixedAttr.length - attr.originRaw.length;
			}
		}

		return fixed;
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
		return this.getAttribute('slot') || '';
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
		return this.nodeName;
	}

	get textContent(): string {
		return Array.from(this.childNodes)
			.map(child => child.textContent || '')
			.join('');
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

	constructor(astNode: MLASTElement, document: MLDocument<T, O>) {
		super(astNode, document);
		this.#attributes = astNode.attributes.map(attr => new MLAttr(attr, this));
		this.hasSpreadAttr = astNode.hasSpreadAttr;
		this.selfClosingSolidus = astNode.selfClosingSolidus ? new MLToken(astNode.selfClosingSolidus) : null;
		this.endSpace = astNode.endSpace ? new MLToken(astNode.endSpace) : null;
		this.closeTag = astNode.pearNode ? new MLToken(astNode.pearNode) : null;
		this.namespaceURI =
			(
				[
					'http://www.w3.org/1999/xhtml',
					'http://www.w3.org/2000/svg',
					'http://www.w3.org/1998/Math/MathML',
				] as const
			).find(ns => astNode.namespace === ns) ?? HTML_NAMESPACE;
		this.isForeignElement = this.namespaceURI !== HTML_NAMESPACE;
		this.isCustomElement = astNode.isCustomElement;
		this.#fixedNodeName = astNode.nodeName;

		this.isOmitted = astNode.isGhost;

		this.#tagOpenChar = astNode.tagOpenChar;
	}

	/**
	 * @implements DOM API: `Element`
	 */
	after(...nodes: (string | MLElement<any, any>)[]): void {
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
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions,
	): Animation {
		throw new UnexpectedCallError('Not supported "animate" method');
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
	attachShadow(init: ShadowRootInit): ShadowRoot {
		throw new UnexpectedCallError('Not supported "attachShadow" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	before(...nodes: (string | MLElement<any, any>)[]): void {
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
	click(): void {
		throw new UnexpectedCallError('Not supported "click" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0
	 */
	closest(selectors: string): MLElement<T, O> | null {
		let el: MLElement<T, O> | null = this;

		do {
			if (el.matches(selectors)) {
				return el;
			}
			el = el.parentElement;
		} while (el !== null && el.is(el.ELEMENT_NODE));

		return null;
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
	focus(options?: FocusOptions): void {
		throw new UnexpectedCallError('Not supported "focus" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	getAccessibleName(): string {
		return getAccname(this);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/web-animations-1/#dom-animatable-getanimations
	 */
	getAnimations(options?: GetAnimationsOptions): Animation[] {
		throw new UnexpectedCallError('Not supported "getAnimations" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattribute%E2%91%A0
	 */
	getAttribute(attrName: string) {
		for (const attr of Array.from(this.attributes)) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr.value;
			}
		}
		return null;
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattributenames%E2%91%A0
	 */
	getAttributeNames(): string[] {
		return Array.from(this.attributes).map(attr => attr.name);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenode
	 */
	getAttributeNode(qualifiedName: string): MLAttr<T, O> | null {
		return this.getAttributeToken(qualifiedName)[0] || null;
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
		return Object.freeze(this.#attributes);
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
		this.childNodes.forEach(node => {
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
		});
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
	getElementsByTagName(qualifiedName: string): ReturnType<typeof Element['prototype']['getElementsByTagName']> {
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
			col: this.startCol + this.#tagOpenChar.length,
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
		return !!this.attributes.length;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	hasMutableAttributes() {
		for (const attr of Array.from(this.attributes)) {
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
		for (const child of Array.from(this.childNodes)) {
			if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
				return true;
			}
			if (child.is(child.ELEMENT_NODE)) {
				if (attr && child.hasMutableAttributes()) {
					return true;
				}
				if (child.hasMutableChildren()) {
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
	 * @see https://dom.spec.whatwg.org/#dom-element-insertadjacentelement
	 */
	insertAdjacentElement(where: InsertPosition, element: MLElement<T, O>): MLElement<T, O> | null {
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
	isDescendantByUUIDList(uuidList: string[]) {
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
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-matches%E2%91%A0
	 */
	matches(selector: string): boolean {
		return !!createSelector(selector, this.ownerMLDocument.specs).match(this);
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
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-D589198
	 */
	removeAttributeNode(attr: Attr): Attr {
		throw new UnexpectedCallError('Not supported "removeAttributeNode" method');
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
	 * @implements DOM API: `Element`
	 */
	replaceWith(...nodes: (string | MLElement<any, any>)[]): void {
		replaceWith(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://fullscreen.spec.whatwg.org/#dom-element-requestfullscreen
	 */
	requestFullscreen(options?: FullscreenOptions): Promise<void> {
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
	scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void {
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
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenode
	 */
	setAttributeNode(attr: Attr): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenodens
	 */
	setAttributeNodeNS(attr: Attr): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNodeNS" method');
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
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-toggleattribute%E2%91%A0
	 */
	toggleAttribute(qualifiedName: string, force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "toggleAttribute" method');
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
		const attrString = attrs.length ? ' ' + attrs.join('') : '';
		const startTag = `<${this.nodeName}${attrString}>`;
		const childNodes = children.map(node => {
			if (node.is(node.ELEMENT_NODE)) {
				return node.toNormalizeString();
			}
			return node.originRaw;
		});
		const endTag = `</${this.nodeName}>`;
		const normalizedString = `${startTag}${childNodes.join('')}${endTag}`;

		this.#normalizedString = normalizedString;
		return normalizedString;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	toString() {
		return this.raw;
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
